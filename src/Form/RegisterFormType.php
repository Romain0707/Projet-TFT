<?php

namespace App\Form;

use App\Entity\User;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
<<<<<<< HEAD
use Symfony\Component\Form\Extension\Core\Type\TextType;
=======
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
>>>>>>> main

class RegisterFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('username')
<<<<<<< HEAD
            ->add('password')
            ->add('username', TextType::class, [
                'attr' => [
                    'class' => 'form-input',
                    'placeholder' => 'Pseudonyme'
                ],
                'label' => false
            ])
            ->add('password', TextType::class, [
                'attr' => [
                    'class' => 'form-input',
                    'placeholder' => 'Mots de passe'
                ],
                'label' => false
            ])
            ;
=======
            ->add('password', PasswordType::class)
            ->add('submit', SubmitType::class, [
                'label' => 'S\'inscrire'
            ])
        ;
>>>>>>> main
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => User::class,
        ]);
    }
}
