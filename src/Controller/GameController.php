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
        return $this->render('game/index.html.twig');
    }

    #[Route('/game/placement-data', name: 'game_placement_data')]
    public function placementData(TeamRepository $teamRepo): JsonResponse
    {
        $teamA = $teamRepo->find(rand(1, 10));
        $teamB = $teamRepo->find(rand(1, 10));

        return new JsonResponse([
            'board' => [
                'width' => 6,
                'height' => 4
            ],
            'teams' => [
                'A' => $teamA->getPersonnage()->map(fn($p) => [
                    'id' => $p->getId(),
                    'name' => $p->getName(),
                    'role' => $p->getRole()->getName(),
                    'range' => $p->getPortee()
                ])->toArray(),
                'B' => $teamB->getPersonnage()->map(fn($p) => [
                    'id' => $p->getId(),
                    'name' => $p->getName(),
                    'role' => $p->getRole()->getName(),
                    'range' => $p->getPortee()
                ])->toArray()
            ]
        ]);
    }
}
