<?php

namespace App\Controller;

use App\Repository\PersonnageRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PersonnageController extends AbstractController
{
    #[Route('/personnage', name: 'app_personnage')]
    public function index(PersonnageRepository $persoRepo): Response
    {
        $perso = $persoRepo->findAll();
        return $this->render('personnage/index.html.twig', [
            'perso' => $perso,
        ]);
    }
}