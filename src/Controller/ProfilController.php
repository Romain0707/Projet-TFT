<?php

namespace App\Controller;

use App\Entity\Team;
use App\Repository\TeamRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

final class ProfilController extends AbstractController
{
    #[Route('/profil', name: 'profil')]
    public function index(Security $user, TeamRepository $teamRepo): Response
    {
        $team = $teamRepo->findBy(['user_id' => $user->getId()]);
        return $this->render('profil/index.html.twig', [
            'username' => $user->getUsername(),
            'team' => $team,
        ]);
    }

    #[Route('/profil/team/activate', name: 'activate_team', methods: ['POST'])]
    public function activateTeam(Security $user, Request $request, TeamRepository $teamRepo, EntityManagerInterface $em): JsonResponse
    {
        // Récupérer les données JSON envoyées
        $data = json_decode($request->getContent(), true);
        $teamId = $data['id'];

        $team = $teamRepo->findOneBy(['id' => $teamId]);
        
        if ($team) {
            $teamAll = $teamRepo->findBy(['user_id' => $user->getId()]);
            foreach ($teamAll as $t) {
                if ($t->getUserId() === $team->getUserId()) {
                    $t->setActive(false);
                    $em->persist($t);
                }
            }
            $team->setActive(true);
            $em->persist($team);
            $em->flush();
        }

        return $this->json([
            'html' => $this->renderView('partials/team.html.twig', [
                'team' => $teamRepo->findBy(['user_id' => $user->getId()])
                ]),
        ]);
    }

    #[Route('/profil/team/delete/{id}', name: 'team_delete')]
    public function remove(Team $team, Request $request, EntityManagerInterface $entityManager)
    {
        
        if($this->isCsrfTokenValid('SUP'.$team->getId(),$request->get('_token')) && $team->isActive() == false){
            $entityManager->remove($team);
            $entityManager->flush();
            return $this->redirectToRoute('profil');
        } else {
            $this->addFlash('error','La suppression n\'est pas possible pour une équipe active');
            return $this->redirectToRoute('profil');
        }
    }
}
