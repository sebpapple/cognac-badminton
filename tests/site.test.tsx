// Runtime validation coverage for: public pages, navigation, and key interactions.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App";

function RouteLocation() {
  const location = useLocation();
  return (
    <span aria-hidden="true" data-testid="current-route">
      {location.pathname}
    </span>
  );
}

function renderAt(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteLocation />
      <App />
    </MemoryRouter>,
  );
}

describe("navigation et accessibilité", () => {
  it("expose le lien d’évitement et une navigation principale nommée", () => {
    renderAt();

    expect(
      screen.getByRole("link", { name: "Aller au contenu" }),
    ).toHaveAttribute("href", "#contenu");
    expect(
      screen.getByRole("navigation", { name: "Navigation principale" }),
    ).toBeInTheDocument();
  });

  it("ouvre le menu, le ferme avec Échap et restitue le focus au bouton", async () => {
    const user = userEvent.setup();
    renderAt();

    const openButton = screen.getByRole("button", { name: "Ouvrir le menu" });
    await user.click(openButton);

    expect(openButton).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");

    expect(
      screen.getByRole("button", { name: "Ouvrir le menu" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: "Ouvrir le menu" }),
    ).toHaveFocus();
  });

  it("navigue vers Horaires depuis le menu et met à jour le titre du document", async () => {
    const user = userEvent.setup();
    renderAt();

    const navigation = screen.getByRole("navigation", {
      name: "Navigation principale",
    });
    await user.click(within(navigation).getByRole("link", { name: "Horaires" }));

    expect(screen.getByTestId("current-route")).toHaveTextContent("/horaires");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Trouvez vos horaires de jeu.",
      }),
    ).toBeInTheDocument();
    expect(document.title).toContain("Cognac Badminton");
  });

  it.each([
    ["/creneaux", "/horaires", "Trouvez vos horaires de jeu."],
    ["/club", "/bureau", "Un club, mille façons de jouer."],
  ])("redirige l’ancienne route %s vers %s", (from, to, heading) => {
    renderAt(from);

    expect(screen.getByTestId("current-route")).toHaveTextContent(to);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  });

  it("donne un titre à la route équipe avant le chargement de ses données", () => {
    renderAt("/equipes/equipe-1");

    expect(document.title).toBe("Équipe | Cognac Badminton");
    expect(document.title).not.toContain("Page indisponible");
  });

  it("actualise le titre quand le contenu asynchrone d’une page équipe arrive", async () => {
    renderAt("/equipes/equipe-1");

    act(() => {
      const heading = document.createElement("h1");
      heading.textContent = "Équipe 1";
      document.getElementById("contenu")?.replaceChildren(heading);
    });

    await waitFor(() => {
      expect(document.title).toBe("Équipe 1 | Cognac Badminton");
    });
  });
});

describe("accueil et carrousel", () => {
  it("affiche le contenu principal avec les mises en évidence", () => {
    renderAt();

    expect(
      screen.getByRole("heading", { level: 1, name: "Cognac Badminton" }),
    ).toBeInTheDocument();
    expect(screen.getByText("corps", { selector: "em" })).toBeInTheDocument();
    expect(
      screen.getByText("ensemble", { selector: "em" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Actualités" })).toBeVisible();
  });

  it("fait défiler les photos dans les deux sens et boucle aux extrémités", async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole("button", { name: "Photo précédente" }));
    expect(screen.getByText("Photo 3 sur 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Photo suivante" }));
    expect(screen.getByText("Photo 1 sur 3")).toBeInTheDocument();
  });
});

describe("pages publiques et données de démonstration", () => {
  it("affiche les deux groupes d’horaires avec des tableaux accessibles", () => {
    renderAt("/horaires");

    expect(screen.getByRole("heading", { name: /Adultes/ })).toBeVisible();
    expect(screen.getByRole("heading", { name: /Jeunes/ })).toBeVisible();
    expect(
      screen.getByRole("table", { name: "adultes · Beaulieu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "jeunes · Jean Monnet" }),
    ).toBeInTheDocument();
  });

  it("affiche les évènements de démonstration", () => {
    renderAt("/evenements");

    expect(
      screen.getByRole("heading", { name: "Tournoi départemental" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Rencontre interclubs" }),
    ).toBeVisible();
  });

  it("explique que les équipes seront disponibles après synchronisation", () => {
    renderAt("/equipes");

    expect(
      screen.getByRole("heading", { level: 1, name: /Nos équipes/ }),
    ).toBeVisible();
    expect(
      screen.getByText(/disponible après la prochaine synchronisation FFBaD/),
    ).toBeInTheDocument();
  });

  it("pagine les actualités sans perdre le premier article", async () => {
    const user = userEvent.setup();
    renderAt("/actualites");

    expect(
      screen.getByRole("heading", { name: "La saison reprend sur les terrains" }),
    ).toBeVisible();
    const nextPage = screen.getByRole("button", { name: "Page suivante" });
    expect(
      screen.getByRole("button", { name: "Page précédente" }),
    ).toBeDisabled();

    await user.click(nextPage);
    expect(
      screen.getByRole("heading", { name: "Le badminton, aussi pour le plaisir" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Page précédente" }));
    expect(
      screen.getByRole("heading", { name: "La saison reprend sur les terrains" }),
    ).toBeVisible();
  });

  it("ouvre une actualité par son identifiant et gère un identifiant absent", () => {
    const { unmount } = renderAt("/actualites/rentrée");

    expect(
      screen.getByRole("heading", { name: "La saison reprend sur les terrains" }),
    ).toBeVisible();
    expect(screen.getByText(/partager une saison sportive et conviviale/)).toBeVisible();

    unmount();
    renderAt("/actualites/inconnue");
    expect(
      screen.getByText("Cette actualité n’est pas disponible."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Retour aux actualités" }),
    ).toHaveAttribute("href", "/actualites");
  });

  it("réutilise les coordonnées publiques dans le pied de page", () => {
    renderAt("/mentions-legales");

    expect(
      screen
        .getAllByRole("link", { name: "badcognac@gmail.com" })
        .every((link) => link.getAttribute("href") === "mailto:badcognac@gmail.com"),
    ).toBe(true);
    expect(screen.getByText(/Cognac · Charente/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /Mentions légales/ }),
    ).toBeInTheDocument();
  });
});

describe("formulaire de contact", () => {
  async function completeContactForm() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nom complet"), "Camille Exemple");
    await user.type(
      screen.getByLabelText("Adresse e-mail"),
      "camille@example.com",
    );
    await user.selectOptions(screen.getByLabelText("Objet"), "Inscription");
    await user.type(
      screen.getByLabelText("Votre message"),
      "Je souhaite découvrir le club.",
    );
    return user;
  }

  it("signale la réussite quand le service accepte un message valide", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderAt("/contact");

    await completeContactForm();
    await user.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(
      await screen.findByText(/Merci pour votre message\./, {
        selector: ".form-success",
      }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.web3forms.com/submit",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("affiche une erreur explicite si l’envoi échoue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const user = userEvent.setup();
    renderAt("/contact");

    await completeContactForm();
    await user.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Le message n’a pas pu être envoyé.",
    );
  });

  it("exige les champs obligatoires avant de pouvoir envoyer", () => {
    renderAt("/contact");

    expect(screen.getByLabelText("Nom complet")).toBeRequired();
    expect(screen.getByLabelText("Adresse e-mail")).toBeRequired();
    expect(screen.getByLabelText("Objet")).toBeRequired();
    expect(screen.getByLabelText("Votre message")).toBeRequired();
  });
});

describe("routes de repli et espace webmaster", () => {
  it("permet d’annuler la redirection automatique de la page inconnue", async () => {
    const user = userEvent.setup();
    renderAt("/page-inconnue");

    await user.click(
      screen.getByRole("button", {
        name: "Désactiver la redirection automatique",
      }),
    );

    expect(
      screen.getByText("Vous restez sur cette page."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("current-route")).toHaveTextContent(
      "/page-inconnue",
    );
  });

  it("indique que l’espace webmaster nécessite Firebase en configuration locale", () => {
    renderAt("/webmaster");

    expect(
      screen.getByRole("heading", { name: "Configuration requise" }),
    ).toBeVisible();
    expect(
      screen.getByText(/Configurez Firebase Authentication et Firestore/),
    ).toBeInTheDocument();
  });
});
