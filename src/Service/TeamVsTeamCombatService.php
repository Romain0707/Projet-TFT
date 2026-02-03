<?php

namespace App\Service;

use App\Entity\Team;

class TeamVsTeamCombatService
{
    public function fight(Team $teamA, Team $teamB): array
    {
        $rounds = [];
        $round = 1;

        $fightersA = $this->initFighters($teamA);
        $fightersB = $this->initFighters($teamB);

        while (!$this->isDefeated($fightersA) && !$this->isDefeated($fightersB)) {
            $roundData = ['round' => $round, 'actions' => []];

            $this->attackPhase($fightersA, 'A', $fightersB, 'B', $roundData['actions']);
            if ($this->isDefeated($fightersB)) { $rounds[] = $roundData; break; }

            $this->attackPhase($fightersB, 'B', $fightersA, 'A', $roundData['actions']);
            $rounds[] = $roundData;

            $round++;
        }

        return [
            'teams' => [
                'A' => ['name' => $teamA->getName()],
                'B' => ['name' => $teamB->getName()]
            ],
            'winner' => $this->isDefeated($fightersA) ? $teamB->getName() : $teamA->getName(),
            'rounds' => $rounds
        ];
    }

    private function initFighters(Team $team): array
    {
        $fighters = [];
        foreach ($team->getPersonnage() as $perso) {
            $fighters[] = [
                'name' => $perso->getName(),
                'hp' => $perso->getHealth(),
                'attack' => $perso->getPower()
            ];
        }
        return $fighters;
    }

    private function attackPhase(array &$attackers, string $attackerTeam, array &$defenders, string $defenderTeam, array &$actions): void
    {
        foreach ($attackers as &$attacker) {
            if ($attacker['hp'] <= 0) continue;

            $targets = array_filter($defenders, fn($d) => $d['hp'] > 0);
            if (empty($targets)) return;

            $targetKey = array_rand($targets);
            $defenders[$targetKey]['hp'] -= $attacker['attack'];

            $actions[] = [
                'attacker' => $attacker['name'],
                'target' => $defenders[$targetKey]['name'],
                'damage' => $attacker['attack'],
                'target_hp' => max(0, $defenders[$targetKey]['hp']),
                'dead' => $defenders[$targetKey]['hp'] <= 0,
                'attacker_team' => $attackerTeam,
                'target_team' => $defenderTeam
            ];
        }
    }

    private function isDefeated(array $fighters): bool
    {
        foreach ($fighters as $f) if ($f['hp'] > 0) return false;
        return true;
    }
}


