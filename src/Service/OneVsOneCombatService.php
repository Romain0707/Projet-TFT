<?php
namespace App\Service;

class OneVsOneCombatService
{
    public function fight($perso1, $perso2): array
    {
        // On copie les stats pour ne PAS modifier la DB
        $hp1 = $perso1->getHealth();
        $hp2 = $perso2->getHealth();

        $atk1 = $perso1->getPower();
        $atk2 = $perso2->getPower();

        $log = [];
        $round = 1;

        $log[] = "Combat entre {$perso1->getName()} et {$perso2->getName()}";

        while ($hp1 > 0 && $hp2 > 0) {
            $log[] = "— Tour $round —";

            // Perso 1 attaque
            $hp2 -= $atk1;
            $log[] = "{$perso1->getName()} attaque {$perso2->getName()} et inflige $atk1 dégâts";

            if ($hp2 <= 0) {
                $log[] = "💀 {$perso2->getName()} est vaincu";
                break;
            }

            // Perso 2 attaque
            $hp1 -= $atk2;
            $log[] = "{$perso2->getName()} attaque {$perso1->getName()} et inflige $atk2 dégâts";

            if ($hp1 <= 0) {
                $log[] = "💀 {$perso1->getName()} est vaincu";
                break;
            }

            $log[] = "PV restants : {$perso1->getName()} ($hp1) | {$perso2->getName()} ($hp2)";
            $round++;
        }

        $winner = $hp1 > 0 ? $perso1->getName() : $perso2->getName();
        $log[] = "🏆 Victoire de $winner";

        return $log;
    }
}