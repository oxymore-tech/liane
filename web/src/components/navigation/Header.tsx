"use client";
import React, { useEffect, useState } from "react";
import { TextInput } from "@/components/forms/TextInput";
import { useAppContext, useCurrentUser } from "@/components/ContextProvider";
import { useActor, useInterpret } from "@xstate/react";
import { CreateLoginMachine } from "@liane/common";
import { Button, Modal, Navbar } from "flowbite-react";
import { Icon } from "@/components/base/Icon";

export type HeaderProps = {};

function LoginModal({ show, onClosed }: { onClosed: () => void; show: boolean }) {
  const [adminError, setAdminError] = useState(false);
  const { refreshUser, services } = useAppContext();
  const [m] = useState(() =>
    CreateLoginMachine(
      {
        sendPhone: (p: string) => services.auth.sendSms(p),
        sendCode: async (phone: string, code: string) => {
          return await services.auth.login({ phone, code });
        }
      },
      undefined,
      false
    )
  );

  const machine = useInterpret(m);
  const [state] = useActor(machine);
  useEffect(() => {
    if (!state.done) return;
    machine.onDone(async () => {
      if (state.context.authUser?.isSignedUp) {
        await refreshUser();
        onClosed();
      } else setAdminError(true);
    });
  }, [machine, refreshUser, state]);

  const hasFailed = state.toStrings().some(x => x.includes("failure"));
  const handleEnterKey = e => {
    if (e.key === "Enter") {
      machine.send(hasFailed ? "RETRY" : "NEXT");
    }
  };
  return (
    <Modal show={show} onClose={onClosed} popup id={"logout"}>
      <Modal.Header />
      <Modal.Body>
        <div className="space-y-6">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">Connexion à un compte administrateur</h3>
          <div className="flex flex-col gap-4">
            <TextInput
              onKeyDown={handleEnterKey}
              id="phone"
              placeholder="(+33)XXXXXXXXX"
              required={true}
              label="Numéro de téléphone"
              onTextChange={data => machine.send("SET", { data })}
              value={state.context.phone.value}
              isValid={state.context.phone.valid}
              type="tel"
              maxLength={state.context.phone.value?.startsWith("0") ? 10 : 12}
              disabled={!state.matches("phone")}
            />
            {state.matches("code") && (
              <TextInput
                onKeyDown={handleEnterKey}
                id={"code"}
                label="Code reçu par SMS"
                value={state.context.code.value}
                onTextChange={data => machine.send("SET", { data })}
                maxLength={6}
              />
            )}

            {adminError && <p className="text-red-500 px-1">Erreur: veuillez réessayer avec un compte administrateur.</p>}
            {hasFailed && <p className="text-red-500 px-1">{"Impossible d'effectuer la demande."}</p>}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          gradientDuoTone="pinkToOrange"
          isProcessing={state.toStrings().some(x => x.includes("pending"))}
          disabled={state.context[state.matches("phone") ? "phone" : "code"].valid !== true}
          onClick={() => {
            machine.send(hasFailed ? "RETRY" : "NEXT");
          }}>
          {hasFailed && <Icon name={"retry"} />}
          {hasFailed ? "Réessayer" : state.matches("phone") ? "Suivant" : "Connexion"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function LogoutModal({ show, onClosed }: { onClosed: () => void; show: boolean }) {
  const { refreshUser, services } = useAppContext();
  return (
    <Modal show={show} onClose={onClosed} popup id="login">
      <Modal.Header />
      <Modal.Body>
        <div className="space-y-6">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">Déconnexion</h3>
          <p>Voulez-vous vraiment fermer votre session ?</p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          gradientDuoTone="pinkToOrange"
          onClick={() => {
            services.storage.clearStorage().then(() => refreshUser());
            onClosed?.();
          }}>
          Déconnexion
        </Button>
        <Button color="gray" onClick={onClosed}>
          Annuler
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
export function Header({}: HeaderProps) {
  const user = useCurrentUser();
  const [modalVisible, setModalVisible] = useState(false);

  const onClose = () => {
    setModalVisible(false);
  };

  return (
    <>
      <Navbar fluid>
        <Navbar.Brand className="flex-none text-xl font-semibold dark:text-white" href="#">
          Liane
        </Navbar.Brand>
        <div className="flex md:order-2">
          <Button gradientDuoTone="pinkToOrange" onClick={() => setModalVisible(true)}>
            {user ? "Déconnexion" : "Connexion"}
          </Button>
          <Navbar.Toggle />
        </div>
      </Navbar>
      <LogoutModal onClosed={onClose} show={modalVisible && !!user} />
      {modalVisible && <LoginModal onClosed={onClose} show={modalVisible && !user} />}
    </>
  );
}
