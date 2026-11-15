use sqlx::PgConnection;

use crate::error::Result;

const MAX_BASE_LENGTH: usize = 80;
const FALLBACK: &str = "liane";
const RESERVED: [&str; 5] = ["admin", "match", "mine", "report", "search"];

pub fn slugify(name: &str) -> String {
    let mut slug = String::new();
    for character in name.chars().flat_map(char::to_lowercase) {
        match ascii_equivalent(character) {
            Some(ascii) => slug.push_str(ascii),
            None if character.is_ascii_alphanumeric() => slug.push(character),
            None => {
                if !slug.is_empty() && !slug.ends_with('-') {
                    slug.push('-');
                }
            }
        }
    }

    let slug: String = slug.chars().take(MAX_BASE_LENGTH).collect();
    let slug = slug.trim_matches('-');
    if slug.is_empty() || RESERVED.contains(&slug) {
        format!("{FALLBACK}-{slug}").trim_matches('-').to_string()
    } else {
        slug.to_string()
    }
}

fn ascii_equivalent(character: char) -> Option<&'static str> {
    let ascii = match character {
        'à' | 'â' | 'ä' | 'á' | 'ã' => "a",
        'ç' => "c",
        'é' | 'è' | 'ê' | 'ë' => "e",
        'î' | 'ï' | 'í' | 'ì' => "i",
        'ñ' => "n",
        'ô' | 'ö' | 'ó' | 'ò' | 'õ' => "o",
        'ù' | 'û' | 'ü' | 'ú' => "u",
        'ÿ' => "y",
        'œ' => "oe",
        'æ' => "ae",
        _ => return None,
    };
    Some(ascii)
}

pub async fn unique_slug(connection: &mut PgConnection, name: &str) -> Result<String> {
    let base = slugify(name);
    let taken: Vec<String> =
        sqlx::query_scalar("SELECT slug FROM liane WHERE slug = $1 OR slug LIKE $1 || '-%'")
            .bind(&base)
            .fetch_all(connection)
            .await?;

    if !taken.contains(&base) {
        return Ok(base);
    }
    let suffix = (2..)
        .find(|suffix| !taken.contains(&format!("{base}-{suffix}")))
        .unwrap_or_default();
    Ok(format!("{base}-{suffix}"))
}

#[cfg(test)]
mod tests {
    use super::slugify;

    #[test]
    fn slug_is_lowercase_ascii_with_hyphens() {
        assert_eq!(slugify("Florac – Mende"), "florac-mende");
        assert_eq!(
            slugify("  Vallée Française / Alès "),
            "vallee-francaise-ales"
        );
        assert_eq!(slugify("Cœur de Lozère"), "coeur-de-lozere");
    }

    #[test]
    fn slug_never_collides_with_a_route_or_is_empty() {
        assert_eq!(slugify("Search"), "liane-search");
        assert_eq!(slugify("???"), "liane");
    }
}
