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
    public function placementData(TeamRepository $teamRepo, SessionInterface $session): JsonResponse
    {
        $teamAId = rand(1, 10);
        $teamBId = rand(1, 10);
        while ($teamBId === $teamAId) {
            $teamBId = rand(1, 10);
        }

        $teamA = $teamRepo->find($teamAId);
        $teamB = $teamRepo->find($teamBId);

        if (!$teamA || !$teamB) {
            return new JsonResponse(['error' => 'Team not found'], 404);
        }

        // ✅ on fige le match en session
        $session->set('selected_team_ids', [
            'teamA' => $teamAId,
            'teamB' => $teamBId,
        ]);

        return new JsonResponse([
            'board' => ['width' => 6, 'height' => 4],
            'meta' => [
                'teamA_id' => $teamAId,
                'teamB_id' => $teamBId,
            ],
            'teams' => [
                'A' => $teamA->getPersonnage()->map(fn($p) => [
                    'id' => $p->getId(),
                    'name' => $p->getName(),
                    'role' => $p->getRole()->getName(),
                    'range' => $p->getPortee(),
                    'image_url' => $p->getImageUrl(),
                ])->toArray(),
                'B' => $teamB->getPersonnage()->map(fn($p) => [
                    'id' => $p->getId(),
                    'name' => $p->getName(),
                    'role' => $p->getRole()->getName(),
                    'range' => $p->getPortee(),
                    'image_url' => $p->getImageUrl(),
                ])->toArray()
            ]
        ]);
    }

    #[Route('/game/placement/save', name: 'game_placement_save', methods: ['POST'])]
public function savePlacement(Request $request, SessionInterface $session): JsonResponse
{
    $payload = json_decode($request->getContent(), true);

    if (!is_array($payload)) {
        return new JsonResponse(['ok' => false, 'error' => 'Invalid JSON'], 400);
    }

    // ✅ Normalisation : on accepte plusieurs formats front
    $teamA = $payload['teamA'] ?? $payload['A'] ?? [];
    $teamB = $payload['teamB'] ?? $payload['B'] ?? [];

    // On force le format: [ ['id'=>int, 'position'=>['x'=>int,'y'=>int]], ...]
    $normalize = static function(array $arr): array {
        $out = [];
        foreach ($arr as $u) {
            if (!isset($u['id'], $u['position']['x'], $u['position']['y'])) continue;
            $out[] = [
                'id' => (int) $u['id'],
                'position' => [
                    'x' => (int) $u['position']['x'],
                    'y' => (int) $u['position']['y'],
                ],
            ];
        }
        return $out;
    };

    $placement = [
        'teamA' => $normalize($teamA),
        'teamB' => $normalize($teamB),
    ];

    // (optionnel) empêcher save si rien placé
    if (count($placement['teamA']) === 0 || count($placement['teamB']) === 0) {
        return new JsonResponse([
            'ok' => false,
            'error' => 'Both teams must have at least 1 unit placed.'
        ], 400);
    }

    $selected = $session->get('selected_team_ids');
    if (!is_array($selected) || !isset($selected['teamA'], $selected['teamB'])) {
        return new JsonResponse(['ok' => false, 'error' => 'No selected teams'], 400);
    }

    $placement['selected_team_ids'] = $selected;
    $session->set('placement', $placement);

    return new JsonResponse([
        'ok' => true,
        'redirect' => '/combat'
    ]);
}
}