import { useState } from "react";
import { Trip } from "../api";
import { Button } from "./base/Button";
import { Modal } from "./base/Modal";

interface TripsProps {
    searchedTrips: Trip[];
}

export function Available_trips({ searchedTrips }: TripsProps) {
    const [show, setShow] = useState(false);
    const [currentUser, setCurrentUser] = useState("");
    function printModal(user:string) {
        setCurrentUser(user);
        setShow(true);
    }
    function hideModal() {
        setShow(false);
    }

    return <div>
        <div className="container" style={{background: "white", bottom: 10, left: 0, width: 500, zIndex: 3, position: "absolute" }}>
            <ul className="list-disc">
                {
                    searchedTrips.map((search) => (
                        <li style={{margin: 10}}>{search.coordinates[0].id} - {search.coordinates[1].id}- {search.time}h - <Button label="Demandez à covoiturer" onClick={() => printModal(search.user)}></Button></li>
                    ))
                }
            </ul>
        </div>
        {show && <Modal onConfirm={hideModal} onCancel={hideModal} user={currentUser}></Modal>}
    </div>
}