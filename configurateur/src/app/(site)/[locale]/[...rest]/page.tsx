import { notFound } from 'next/navigation';

/** Toute adresse inconnue sous /fr ou /nl affiche la page 404 du site (avec en-tête et pied de page). */
export default function CatchAll() {
  notFound();
}
