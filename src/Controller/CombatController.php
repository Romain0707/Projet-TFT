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
    public function combatPage( SessionInterface $session, TeamRepository $teamRepo, TeamVsTeamCombatService $combatService ): Response 
    {
        $placement = $session->get('placement');

        if (!is_array($placement) || !isset($placement['teamA'], $placement['teamB'])) {
            return $this->redirectToRoute('game_placement_ui');
        }

        // ✅ récupère les teams choisies au moment du placement
        $selected = $placement['selected_team_ids'] ?? $session->get('selected_team_ids');

        if (!is_array($selected) || !isset($selected['teamA'], $selected['teamB'])) {
            return $this->redirectToRoute('game_placement_ui');
        }

        $teamA = $teamRepo->find((int) $selected['teamA']);
        $teamB = $teamRepo->find((int) $selected['teamB']);

        if (!$teamA || !$teamB) {
            return $this->redirectToRoute('game_placement_ui');
        }

        $result = $combatService->fight($teamA, $teamB, $placement);

        return $this->render('combat/index.html.twig', [
            'fightJson' => $result,
        ]);
    }

    #[Route('/combat/json', name: 'combat_json')]
    public function combatJson( SessionInterface $session, TeamRepository $teamRepo, TeamVsTeamCombatService $combatService ): JsonResponse 
    {
        $placement = $session->get('placement');

        if (!is_array($placement) || !isset($placement['teamA'], $placement['teamB'])) {
            return new JsonResponse(['error' => 'No placement'], 400);
        }

        // ✅ récupère les teams sélectionnées AU MOMENT du placement
        $selected = $placement['selected_team_ids'] ?? $session->get('selected_team_ids');

        if (!is_array($selected) || !isset($selected['teamA'], $selected['teamB'])) {
            return new JsonResponse(['error' => 'No selected teams in session'], 400);
        }

        $teamA = $teamRepo->find((int)$selected['teamA']);
        $teamB = $teamRepo->find((int)$selected['teamB']);

        if (!$teamA || !$teamB) {
            return new JsonResponse(['error' => 'Selected team not found'], 404);
        }

        $result = $combatService->fight($teamA, $teamB, $placement);
        return new JsonResponse($result);
    }
}
