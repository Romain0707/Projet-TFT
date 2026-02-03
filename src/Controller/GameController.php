<?php

namespace App\Controller;

use App\Repository\PersonnageRepository;
use App\Repository\TeamRepository;
use App\Service\OneVsOneCombatService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class GameController extends AbstractController
{
    #[Route('/game', name: 'app_game')]
    public function index(TeamRepository $repository, OneVsOneCombatService $combatService): Response
    {
        $team1 = $repository->findOneBy(['id' => rand(1, 10)]);
        $team2 = $repository->findOneBy(['id' => rand(1, 10)]);

        foreach ($team1->getPersonnage() as $perso1) {
            foreach ($team2->getPersonnage() as $perso2) {
                $combatLog = $combatService->fight($perso1, $perso2);
                // Vous pouvez stocker ou afficher le $combatLog selon vos besoins
            }
        }
        
        dd($combatLog);


        return $this->render('game/index.html.twig', [
        ]);
    }
}
