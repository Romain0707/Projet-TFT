<?php

namespace App\Service;

use App\Entity\Team;

class TeamVsTeamCombatService
{
    private const BOARD_WIDTH = 6;
    private const BOARD_HEIGHT = 4;

    public function fight(Team $teamA, Team $teamB, array $placement): array
    {
        $rounds = [];
        $round = 1;

        $fightersA = $this->initFighters($teamA, 'A', $placement['teamA'] ?? []);
        $fightersB = $this->initFighters($teamB, 'B', $placement['teamB'] ?? []);

        if (count($fightersA) === 0 || count($fightersB) === 0) {
            return [
                'board' => [
                    'width' => self::BOARD_WIDTH,
                    'height' => self::BOARD_HEIGHT
                ],
                'teams' => [
                    'A' => ['name' => $teamA->getName()],
                    'B' => ['name' => $teamB->getName()]
                ],
                'units' => array_merge($this->exportUnits($fightersA), $this->exportUnits($fightersB)),
                'winner' => count($fightersA) === 0 ? $teamB->getName() : $teamA->getName(),
                'rounds' => [],
                'error' => 'Missing placed units for one team'
            ];
        }

        $initialUnits = array_merge(
            $this->exportUnits($fightersA),
            $this->exportUnits($fightersB)
        );

        while (!$this->isDefeated($fightersA) && !$this->isDefeated($fightersB)) {
            $roundData = [
                'round' => $round,
                'actions' => []
            ];

            $this->turn($fightersA, 'A', $fightersB, 'B', $roundData['actions']);
            if ($this->isDefeated($fightersB)) {
                $rounds[] = $roundData;
                break;
            }

            $this->turn($fightersB, 'B', $fightersA, 'A', $roundData['actions']);
            $rounds[] = $roundData;

            $round++;
            if ($round > 200) break;
        }

        return [
            'board' => [
                'width' => self::BOARD_WIDTH,
                'height' => self::BOARD_HEIGHT
            ],
            'teams' => [
                'A' => ['name' => $teamA->getName()],
                'B' => ['name' => $teamB->getName()]
            ],
            'units' => $initialUnits,
            'winner' => $this->isDefeated($fightersA)
                ? $teamB->getName()
                : $teamA->getName(),
            'rounds' => $rounds
        ];
    }


    private function initFighters(Team $team, string $side, array $placements): array
    {
        $posById = [];
        foreach ($placements as $p) {
            if (!isset($p['id'], $p['position']['x'], $p['position']['y'])) continue;
            $posById[(int)$p['id']] = [
                'x' => (int)$p['position']['x'],
                'y' => (int)$p['position']['y'],
            ];
        }

        $fighters = [];

        foreach ($team->getPersonnage() as $perso) {
            $id = (int)$perso->getId();

            if (!isset($posById[$id])) {
                continue;
            }

            $isHealer = $perso->getRole()->getId() === 3;

            $fighters[] = [
                'id' => $id,
                'name' => $perso->getName(),
                'hp' => (int)$perso->getHealth(),
                'max_hp' => (int)$perso->getHealth(),
                'attack' => (int)$perso->getPower(),
                'range' => (int)$perso->getPortee(),
                'defense' => (int)$perso->getDefense(),
                'move' => 1,
                'position' => $posById[$id],
                'team' => $side,
                'is_healer' => $isHealer,
            ];
        }

        return $fighters;
    }


    private function exportUnits(array $fighters): array
    {
        return array_map(static fn($f) => [
            'id' => (int)$f['id'],
            'name' => (string)$f['name'],
            'team' => (string)$f['team'],
            'x' => (int)$f['position']['x'],
            'y' => (int)$f['position']['y'],
            'hp' => (int)$f['hp'],
            'range' => (int)$f['range'],
            'attack' => (int)$f['attack'],
        ], $fighters);
    }

    private function turn(array &$attackers, string $attackerTeam, array &$defenders, string $defenderTeam, array &$actions): void
    {
        $occupied = $this->buildOccupied($attackers, $defenders);

        foreach ($attackers as &$attacker) {
            if ($attacker['hp'] <= 0) continue;

            if (isset($attacker['is_healer']) && $attacker['is_healer'] === true) {
                $this->healAlly($attacker, $attackerTeam, $attackers, $attackers, $actions);
                continue; 
            }

            $targetKey = $this->getClosestTarget($attacker, $defenders);
            if ($targetKey === null) return;

            $target = &$defenders[$targetKey];

            $distance = $this->distance($attacker['position'], $target['position']);

            if ($distance > $attacker['range']) {
                $oldPos = $attacker['position'];

                $moved = $this->moveTowards($attacker, $target['position'], $occupied);

                if ($moved && ($oldPos['x'] !== $attacker['position']['x'] || $oldPos['y'] !== $attacker['position']['y'])) {
                    $actions[] = [
                        'type' => 'move',
                        'unit_id' => (int)$attacker['id'],
                        'unit' => (string)$attacker['name'],
                        'team' => $attackerTeam,
                        'from' => $oldPos,
                        'to' => $attacker['position']
                    ];
                }

                $distance = $this->distance($attacker['position'], $target['position']);
            }

            if ($distance <= $attacker['range']) {
                $damage = max(0, $attacker['attack'] - ($target['defense'] * 0.1));
                $target['hp'] -= $damage;

                $actions[] = [
                    'type' => 'attack',
                    'attacker_id' => (int)$attacker['id'],
                    'attacker' => (string)$attacker['name'],
                    'attacker_team' => $attackerTeam,
                    'attacker_position' => $attacker['position'],
                    'target_id' => (int)$target['id'],
                    'target' => (string)$target['name'],
                    'target_team' => $defenderTeam,
                    'target_position' => $target['position'],
                    'damage' => (int)$damage,
                    'target_hp' => max(0, (int)$target['hp']),
                    'dead' => $target['hp'] <= 0
                ];
            }
        }
    }

    private function getClosestTarget(array $attacker, array $defenders): ?int
    {
        $minDistance = PHP_INT_MAX;
        $closestKey = null;

        foreach ($defenders as $key => $defender) {
            if ($defender['hp'] <= 0) continue;

            $distance = $this->distance($attacker['position'], $defender['position']);

            if ($distance <= $minDistance) {
                $minDistance = $distance;
                $closestKey = $key;
            }
        }

        return $closestKey;
    }

    private function moveTowards(array &$attacker, array $targetPos, array &$occupied = []): bool
    {
        $steps = (int)$attacker['move'];

        while ($steps > 0) {
            $cur = $attacker['position'];

            $candidates = [
                ['x' => $cur['x'] + 1, 'y' => $cur['y']],
                ['x' => $cur['x'] - 1, 'y' => $cur['y']],
                ['x' => $cur['x'], 'y' => $cur['y'] + 1],
                ['x' => $cur['x'], 'y' => $cur['y'] - 1],
            ];

            usort($candidates, function ($a, $b) use ($targetPos) {
                return $this->distance($a, $targetPos) <=> $this->distance($b, $targetPos);
            });

            $moved = false;

            foreach ($candidates as $next) {
                if (!$this->inBounds($next)) continue;

                $key = $this->posKey($next);
                if (isset($occupied[$key])) continue; 

                unset($occupied[$this->posKey($cur)]);
                $occupied[$key] = true;

                $attacker['position'] = $next;
                $moved = true;
                break;
            }

            if (!$moved) return false;

            $steps--;
        }

        return true;
    }


    private function posKey(array $pos): string
    {
        return $pos['x'] . ',' . $pos['y'];
    }

    private function buildOccupied(array $fightersA, array $fightersB): array
    {
        $occ = [];
        foreach (array_merge($fightersA, $fightersB) as $f) {
            if ((int)$f['hp'] <= 0) continue;
            $occ[$this->posKey($f['position'])] = true;
        }
        return $occ;
    }

    private function inBounds(array $pos): bool
    {
        return $pos['x'] >= 0 && $pos['x'] < self::BOARD_WIDTH
            && $pos['y'] >= 0 && $pos['y'] < self::BOARD_HEIGHT;
    }

    private function distance(array $a, array $b): int
    {
        return abs((int)$a['x'] - (int)$b['x']) + abs((int)$a['y'] - (int)$b['y']);
    }

    private function isDefeated(array $fighters): bool
    {
        foreach ($fighters as $f) {
            if ((int)$f['hp'] > 0) return false;
        }
        return true;
    }

    private function healAlly(array &$healer, string $healerTeam, array &$fightersA, array &$fightersB, array &$actions): void
    {
        // Trouver un allié à soigner dans l'équipe du soigneur
        $ally = $this->findAllyToHeal($healer, $healerTeam, $fightersA, $fightersB);

        if ($ally === null) return; // Aucun allié valide à soigner

        // Calculer la distance entre le soigneur et l'allié
        $distance = $this->distance($healer['position'], $ally['position']);

        // Si l'allié est hors de portée, on déplace le soigneur
        if ($distance > $healer['range']) {
            // Déplacer le soigneur vers l'allié pour être à portée
            $this->moveTowards($healer, $ally['position'], $actions);

            // Après le mouvement, vérifier si le soigneur est maintenant à portée
            $distance = $this->distance($healer['position'], $ally['position']);
            if ($distance > $healer['range']) {
                // Si le soigneur n'a toujours pas atteint la portée, on arrête le soin pour ce tour
                return;
            }
        }

        // Si le soigneur est à portée, appliquer le soin
        $healingAmount = $healer['attack'];

        // Application du soin sans dépasser la santé maximale
        $ally['hp'] = min($ally['hp'] + $healingAmount, $ally['max_hp']);

        // Enregistrer l'action de soin
        $actions[] = [
            'type' => 'heal',
            'healer_id' => (int)$healer['id'],
            'healer' => (string)$healer['name'],
            'healer_team' => $healerTeam,
            'healer_position' => $healer['position'],
            'target_id' => (int)$ally['id'],
            'target' => (string)$ally['name'],
            'target_team' => $healerTeam,
            'target_position' => $ally['position'],
            'healing' => (int)$healingAmount,
            'target_hp' => (int)$ally['hp']
        ];
    }


    private function findAllyToHeal(array $healer, string $healerTeam, array &$fightersA, array &$fightersB): ?array
    {
        // Sélectionner les alliés en fonction de l'équipe du soigneur
        $allies = ($healerTeam === 'A') ? $fightersA : $fightersB;

        $minHpAlly = null;

        foreach ($allies as $ally) {
            // Ignore le soigneur lui-même
            if ($ally['id'] === $healer['id']) continue;

            // Ignore les alliés morts
            if ($ally['hp'] <= 0) continue;

            // Calculer la distance entre le soigneur et l'allié
            $distance = $this->distance($healer['position'], $ally['position']);

            // Vérifier si l'allié est dans la portée du soigneur
            if ($distance > $healer['range']) continue;  // Si l'allié est hors de portée, on passe

            // Sélectionner l'allié avec le moins de points de vie
            if ($minHpAlly === null || $ally['hp'] < $minHpAlly['hp']) {
                $minHpAlly = $ally;
            }
        }

        return $minHpAlly; // Retourner l'allié à soigner, ou null si aucun allié n'est à portée
    }
}
