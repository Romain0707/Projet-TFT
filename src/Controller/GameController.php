<?php

namespace App\Controller;

use App\Repository\TeamRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Security\Core\User\UserInterface;

final class GameController extends AbstractController
{
    #[Route('/game/placement', name: 'game_placement_ui')]
    public function placementUi(): Response
    {
        return $this->render('game/placement.html.twig');
    }


    #[Route('/game/placement-data', name: 'game_placement_data')]
    public function placementData(TeamRepository $teamRepo, SessionInterface $session, Security $user): JsonResponse
    {
        $teamA = $teamRepo->findOneBy(['user_id' => $user->getId(), 'active' => true]);
        $teamB = $teamRepo->createQueryBuilder('t')->where('t.user_id != :userId')->andWhere('t.active = true')->setParameter('userId', $user->getId())->orderBy('RAND()')->getQuery()->getOneOrNullResult();

        $session->set('selected_team_ids', [
            'teamA' => $teamA?->getId(),
            'teamB' => $teamB?->getId(),
        ]);

        return new JsonResponse([
            'board' => ['width' => 6, 'height' => 4],
            'meta' => [
                'teamA_id' => $teamA?->getId(),
                'teamA_name' => $teamA?->getName(),
                'teamB_id' => $teamB?->getId(),
                'teamB_name' => $teamB?->getName(),
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

        $teamA = $payload['teamA'] ?? $payload['A'] ?? [];
        $teamB = $payload['teamB'] ?? $payload['B'] ?? [];

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

        if (count($placement['teamA']) === 0 || count($placement['teamB']) === 0) {
            return new JsonResponse([
                'ok' => false,
                'error' => 'Both teams must have at least 1 unit placed.'
            ], 400);
        }

        $selected = $session->get('selected_team_ids');
        $placement['selected_team_ids'] = $selected;
        $session->set('placement', $placement);

        return new JsonResponse([
            'ok' => true,
            'redirect' => '/combat'
        ]);
    }
}