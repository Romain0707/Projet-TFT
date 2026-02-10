<?php

namespace App\Controller;

use App\Repository\TeamRepository;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\Session\SessionInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;

final class PlayController extends AbstractController
{
    #[Route('/play', name: 'app_play')]
public function placementData(TeamRepository $teamRepo, Security $user): Response
    {
        $team = $teamRepo->findOneBy(['user_id' => $user->getId(), 'active' => true]);

return $this->render('play/index.html.twig', [
            'team' => $team,
        ]);
    }
}
