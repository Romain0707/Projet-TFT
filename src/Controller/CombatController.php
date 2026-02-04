<?php

namespace App\Controller;

use App\Repository\TeamRepository;
use App\Service\TeamVsTeamCombatService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Attribute\Route;

final class CombatController extends AbstractController
{
    #[Route('/combat', name: 'combat_page')]
    public function combatPage(): Response
    {
        return $this->render('combat/index.html.twig');
    }

    #[Route('/combat/json', name: 'combat_json')]
    public function combatJson( SessionInterface $session, TeamRepository $teamRepo,  TeamVsTeamCombatService $combatService ): JsonResponse 
    {
        $placement = $session->get('placement');

        if (!$placement) {
            return new JsonResponse(['error' => 'No placement'], 400);
        }

        $teamA = $teamRepo->find(1);
        $teamB = $teamRepo->find(2);

        $result = $combatService->fight($teamA, $teamB, $placement);

        $result['board'] = ['width' => 6, 'height' => 4];

        return new JsonResponse($result);
    }
}
