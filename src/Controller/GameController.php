<?php

namespace App\Controller;

use App\Repository\TeamRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\JsonResponse;

final class GameController extends AbstractController
{
    /* ===================== PLACEMENT UI ===================== */

    #[Route('/game/placement', name: 'game_placement_ui')]
    public function placementUi(): Response
    {
        return $this->render('game/placement.html.twig');
    }

    /* ===================== PLACEMENT DATA ===================== */

    #[Route('/game/placement-data', name: 'game_placement_data')]
    public function placementData(TeamRepository $teamRepo): JsonResponse
    {
        $teamA = $teamRepo->find(1);
        $teamB = $teamRepo->find(2);

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

    #[Route('/game/placement/save', name: 'game_placement_save', methods: ['POST'])]
    public function savePlacement( Request $request, SessionInterface $session ): JsonResponse 
    {
        $placement = json_decode($request->getContent(), true);

        $session->set('placement', $placement);

        return new JsonResponse([
            'ok' => true,
            'redirect' => '/combat'
        ]);
    }
}