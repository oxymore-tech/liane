use axum::Router;
use axum::routing::{delete, get, post};

use crate::liane::handler::{
    create, dismiss_report, exclude_member, exclude_reported, find_matches, get_one, join, leave,
    list, list_all, list_mine, list_reports, remove, report_member, search, update,
    update_membership,
};

mod handler;
mod matching;
pub mod model;
mod report;
mod service;
mod slug;

/// Publiques : `GET /`, `GET /search`, `GET /{slug}`. Réservées aux administrateurs :
/// `POST /`, `GET /admin`, `PUT` et `DELETE /{id}`, `/report…`, `DELETE /{id}/member/{user_id}`.
/// Les autres demandent un compte.
pub fn liane_router() -> Router {
    Router::new()
        .route("/", get(list).post(create))
        .route("/search", get(search))
        .route("/mine", get(list_mine))
        .route("/admin", get(list_all))
        .route("/report", get(list_reports))
        .route("/report/{report_id}/exclude", post(exclude_reported))
        .route("/report/{report_id}/dismiss", post(dismiss_report))
        .route("/match/{liane_request_id}", get(find_matches))
        .route("/{id}", get(get_one).put(update).delete(remove))
        .route(
            "/{id}/membership",
            post(join).put(update_membership).delete(leave),
        )
        .route("/{id}/member/{user_id}", delete(exclude_member))
        .route("/{id}/member/{user_id}/report", post(report_member))
}
