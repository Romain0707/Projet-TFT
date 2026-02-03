<?php

namespace App\Controller;


use App\Repository\TeamRepository;
use App\Service\TeamVsTeamCombatService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\JsonResponse;

final class GameController extends AbstractController
{
    #[Route('/game/json', name: 'game_json')]
    public function combatJson(TeamRepository $teamRepository, TeamVsTeamCombatService $combatService): JsonResponse
    {
        $teamA = $teamRepository->find(rand(1, 10));
        $teamB = $teamRepository->find(rand(1, 10));

        $result = $combatService->fight($teamA, $teamB);

        return new JsonResponse($result);
    }

    #[Route('/game/ui', name: 'game_ui')]
    public function combatUi(): Response
    {
        return $this->render('game/index.html.twig'); // page front
    }
}
