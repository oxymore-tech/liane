"use client";
import React, { KeyboardEvent, useCallback, useState } from "react";
import { TextInput } from "@/components/forms/TextInput";
import { useAppContext, useCurrentUser } from "@/components/ContextProvider";
import { Button, Modal, Navbar } from "flowbite-react";
import { Icon } from "@/components/base/Icon";

export type HeaderProps = {};

function LoginModal({ show, onClosed }: { onClosed: () => void; show: boolean }) {
  const [adminError, setAdminError] = useState(false);
  const { refreshUser, services } = useAppContext();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [enterCode, setEnterCode] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendSms = useCallback(async () => {
    try {
      setLoading(true);
      await services.auth.sendSms(phone);
      setEnterCode(true);
    } catch (e) {
      setHasFailed(true);
    } finally {
      setLoading(false);
    }
  }, [services, phone]);

  const login = useCallback(async () => {
    try {
      setLoading(true);
      const user = await services.auth.login({ phone, code, withRefresh: false });
      if (user.isSignedUp && user.isAdmin) {
        await refreshUser();
        onClosed();
      } else {
        setAdminError(true);
        await services.storage.clearStorage();
      }
    } catch (e) {
      setHasFailed(true);
    } finally {
      setLoading(false);
    }
  }, [services.auth, services.storage, phone, code, refreshUser, onClosed]);

  const handleSubmit = useCallback(() => {
    if (enterCode) {
      return login();
    } else {
      return sendSms();
    }
  }, [enterCode, login, sendSms]);

  const handleEnterKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      e.code === "Enter" && handleSubmit();
    },
    [handleSubmit]
  );

  return (
    <Modal show={show} onClose={onClosed} popup id="logout">
      <Modal.Header />
      <Modal.Body>
        <div className="space-y-6">
          <h3 className="text-xl font-medium text-gray-800 dark:text-white">Connexion à un compte administrateur</h3>
          <div className="flex flex-col gap-4">
            <TextInput
              onKeyDown={handleEnterKey}
              id="phone"
              placeholder="(+33)XXXXXXXXX"
              required={true}
              label="Numéro de téléphone"
              onTextChange={setPhone}
              value={phone}
              isValid={phone.length > 0}
              type="tel"
              maxLength={20}
            />
            {enterCode && (
              <TextInput onKeyDown={handleEnterKey} id="code" label="Code reçu par SMS" value={code} onTextChange={setCode} maxLength={6} />
            )}

            {adminError && <p className="text-red-500 px-1">Erreur: veuillez réessayer avec un compte administrateur.</p>}
            {hasFailed && <p className="text-red-500 px-1">Impossible d&apos;effectuer la demande.</p>}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="justify-start flex-row-reverse gap-2">
        <Button gradientDuoTone="pinkToOrange" isProcessing={loading} disabled={phone.length === 0 || code.length === 0} onClick={handleSubmit}>
          {hasFailed && <Icon name="retry" />}
          {hasFailed ? "Réessayer" : enterCode ? "Connexion" : "Suivant"}
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
          <h3 className="text-xl font-medium text-gray-800 dark:text-white">Déconnexion</h3>
          <p>Voulez-vous vraiment fermer votre session ?</p>
        </div>
      </Modal.Body>
      <Modal.Footer className="justify-start flex-row-reverse gap-2">
        <Button
          gradientDuoTone="pinkToOrange"
          onClick={() => {
            services.storage.clearStorage().then(() => refreshUser());
            onClosed?.();
          }}>
          Déconnexion
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
      <Navbar fluid className="bg-white dark:bg-gray-900 z-[8] w-full">
        <Navbar.Brand className="flex-none text-xl font-semibold dark:text-white text-orange-800 h-12" href="#">
          <svg className="mr-3 h-6 sm:h-9 fill-[#F25757] dark:fill-white" height="24" viewBox="0 0 512 95" aria-label="Liane Brand Logo">
            <use href="/admin/logo.svg#img"></use>
          </svg>
        </Navbar.Brand>
        <div className="flex md:order-2">
          <Button gradientDuoTone="pinkToOrange" onClick={() => setModalVisible(true)}>
            {user ? "Déconnexion" : "Connexion"}
          </Button>
        </div>
      </Navbar>
      <LogoutModal onClosed={onClose} show={modalVisible && !!user} />
      {modalVisible && <LoginModal onClosed={onClose} show={modalVisible && !user} />}
    </>
  );
}
