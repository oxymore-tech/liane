//! Identité pseudonymisée d'un usager, telle que la demande le registre de preuve de covoiturage
//! (API v3.4, schémas `identity_key` et `phone_trunc`, https://tech.covoiturage.beta.gouv.fr, lu le 2026-11-15).

use sha2::{Digest, Sha256};
use unicode_normalization::UnicodeNormalization;

/// `sha256("{téléphone international}-{NOM}")` en hexadécimal, le nom étant en majuscules, sans accent,
/// tirets et apostrophes remplacés par une espace. `phone` est déjà au format `+33612345678`.
pub fn identity_key(phone: &str, last_name: &str) -> String {
    let digest = Sha256::digest(format!("{phone}-{}", normalized_last_name(last_name)));
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// Le numéro international amputé de ses deux derniers chiffres.
pub fn phone_trunc(phone: &str) -> String {
    let kept = phone.chars().count().saturating_sub(2);
    phone.chars().take(kept).collect()
}

fn normalized_last_name(last_name: &str) -> String {
    let letters: String = last_name
        .replace(['œ', 'Œ'], "oe")
        .replace(['æ', 'Æ'], "ae")
        .nfd()
        .filter(|c| !unicode_normalization::char::is_combining_mark(*c))
        .map(|c| {
            if c.is_ascii_alphabetic() {
                c.to_ascii_uppercase()
            } else {
                ' '
            }
        })
        .collect();
    letters.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn last_name_follows_the_registry_example() {
        assert_eq!(
            normalized_last_name("D'Hérûg-de-l'Hérault"),
            "D HERUG DE L HERAULT"
        );
        assert_eq!(normalized_last_name("  Lœuillet "), "LOEUILLET");
    }

    /// Chaîne de l'exemple officiel : `+33701020304-D HERUG DE L HERAULT` (empreinte calculée avec sha256sum).
    #[test]
    fn identity_key_is_the_sha256_of_phone_and_last_name() {
        assert_eq!(
            identity_key("+33701020304", "D'Hérûg-de-l'Hérault"),
            "f44ff5364363e53da750d8b7b44fa3176ea36228c5f951a9c1e606c915093d30"
        );
    }

    #[test]
    fn phone_trunc_drops_the_last_two_digits() {
        assert_eq!(phone_trunc("+33601020304"), "+336010203");
        assert_eq!(phone_trunc("+590690101010"), "+5906901010");
    }
}
