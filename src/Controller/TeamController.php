<?php

namespace App\Controller;

use App\Entity\Team;
use App\Repository\PersonnageRepository;
use App\Repository\TeamRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Security\Core\User\UserInterface;

final class TeamController extends AbstractController
{
    #[Route('/team', name: 'app_team')]
    public function index(PersonnageRepository $personnageRepository): Response
    {

        $personnage = $personnageRepository->findAll();
        return $this->render('team/index.html.twig', [
            'personnage' => $personnage,
        ]);
    }

    #[Route('/team/filters', name: 'teamfiltered', methods: ['GET'])]
    public function filter(PersonnageRepository $personnageRepository, Request $request): JsonResponse
    {   
        $filter = $request->get('filter', 'all');

        $personnage = match($filter) {
            'dps' => $personnageRepository->findBy(['role' => '2']),
            'tank' => $personnageRepository->findBy(['role' => '1']),
            'heal' => $personnageRepository->findBy(['role' => '3']),
            default => $personnageRepository->findAll(),
        };

        return $this->json([
            'html' => $this->renderView('partials/hero.html.twig', [
                'personnage' => $personnage
                ]),
        ]);
    }

    #[Route('/team/save', name: 'save_team', methods: ['POST'])]
    public function save(Request $request, PersonnageRepository $personnageRepository, TeamRepository $teamRepository , EntityManagerInterface $entityManager, UserInterface $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $teamName = $data['name'];
        $characterIds = $data['characters'];

        $characters = $personnageRepository->findBy(['id' => $characterIds]);
        $activeteam = $teamRepository->findOneBy(['user_id' => $user, 'active' => true]);
        $activeteam?->setActive(false);

        $team = new Team();
        $team->setName($teamName);
        $team->setUserId($user);
        $team->setActive(true);

        foreach ($characters as $character) {
            $team->addPersonnage($character);
        }

        $entityManager->persist($team);
        $entityManager->flush();

        return new JsonResponse(['success' => true, 'message' => 'Team saved successfully']);
    }
}
