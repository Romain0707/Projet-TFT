<?php

namespace App\Entity;

use App\Repository\TeamRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TeamRepository::class)]
class Team
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\ManyToOne(inversedBy: 'team')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user_id = null;

    /**
     * @var Collection<int, Personnage>
     */
    #[ORM\ManyToMany(targetEntity: Personnage::class, inversedBy: 'teams')]
    private Collection $personnage;

    public function __construct()
    {
        $this->personnage = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getUserId(): ?User
    {
        return $this->user_id;
    }

    public function setUserId(?User $user_id): static
    {
        $this->user_id = $user_id;

        return $this;
    }

    /**
     * @return Collection<int, Personnage>
     */
    public function getPersonnage(): Collection
    {
        return $this->personnage;
    }

    public function addPersonnage(Personnage $personnage): static
    {
        if (!$this->personnage->contains($personnage)) {
            $this->personnage->add($personnage);
        }

        return $this;
    }

    public function removePersonnage(Personnage $personnage): static
    {
        $this->personnage->removeElement($personnage);

        return $this;
    }
}
