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

        $fightersA = $this->initFighters($teamA, 'A', $placement['teamA']);
        $fightersB = $this->initFighters($teamB, 'B', $placement['teamB']);

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
            'winner' => $this->isDefeated($fightersA)
                ? $teamB->getName()
                : $teamA->getName(),
            'rounds' => $rounds
        ];
    }

    private function initFighters(Team $team, string $side, array $placements): array
    {
        $fighters = [];

        foreach ($team->getPersonnage() as $perso) {
            $pos = ['x' => 0, 'y' => 0];
            foreach ($placements as $p) {
                if ($p['id'] === $perso->getId()) {
                    $pos = $p['position'];
                    break;
                }
            }

            $fighters[] = [
                'id' => $perso->getId(),
                'name' => $perso->getName(),
                'hp' => $perso->getHealth(),
                'attack' => $perso->getPower(),
                'range' => $perso->getPortee(),
                'move' => 1,
                'position' => $pos,
                'team' => $side
            ];
        }

        return $fighters;
    }

    private function turn(
        array &$attackers,
        string $attackerTeam,
        array &$defenders,
        string $defenderTeam,
        array &$actions
    ): void {
        foreach ($attackers as &$attacker) {
            if ($attacker['hp'] <= 0) continue;

            $targetKey = $this->getClosestTarget($attacker, $defenders);
            if ($targetKey === null) return;

            $target = &$defenders[$targetKey];

            $distance = $this->distance($attacker['position'], $target['position']);


            if ($distance > $attacker['range']) {
                $oldPos = $attacker['position'];
                $this->moveTowards($attacker, $target['position']);

                $actions[] = [
                    'type' => 'move',
                    'unit' => $attacker['name'],
                    'team' => $attackerTeam,
                    'from' => $oldPos,
                    'to' => $attacker['position']
                ];

                $distance = $this->distance($attacker['position'], $target['position']);
            }

            if ($distance <= $attacker['range']) {
                $target['hp'] -= $attacker['attack'];

                $actions[] = [
                    'type' => 'attack',
                    'attacker' => $attacker['name'],
                    'attacker_team' => $attackerTeam,
                    'attacker_position' => $attacker['position'],
                    'target' => $target['name'],
                    'target_team' => $defenderTeam,
                    'target_position' => $target['position'],
                    'damage' => $attacker['attack'],
                    'target_hp' => max(0, $target['hp']),
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

            $distance = $this->distance(
                $attacker['position'],
                $defender['position']
            );

            if ($distance < $minDistance) {
                $minDistance = $distance;
                $closestKey = $key;
            }
        }

        return $closestKey;
    }

    private function moveTowards(array &$attacker, array $targetPos): void
    {
        $steps = $attacker['move'];

        while ($steps > 0) {
            if ($attacker['position']['x'] < $targetPos['x']) {
                $attacker['position']['x']++;
            } elseif ($attacker['position']['x'] > $targetPos['x']) {
                $attacker['position']['x']--;
            } elseif ($attacker['position']['y'] < $targetPos['y']) {
                $attacker['position']['y']++;
            } elseif ($attacker['position']['y'] > $targetPos['y']) {
                $attacker['position']['y']--;
            }

            $steps--;
        }
    }

    private function distance(array $a, array $b): int
    {
        return abs($a['x'] - $b['x']) + abs($a['y'] - $b['y']);
    }

    private function isDefeated(array $fighters): bool
    {
        foreach ($fighters as $f) {
            if ($f['hp'] > 0) return false;
        }
        return true;
    }
}
