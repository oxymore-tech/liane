import React, { useContext, useState } from "react";
import { TextInput } from "@/components/base/TextInput";
import { Button } from "@/components/base/Button";
import { AuthService } from "@/api/auth-service";
import { AppContext } from "@/components/ContextProvider";

/**
 * Authentication form.
 */
export function AuthForm() {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const { authUser, setAuthUser } = useContext(AppContext);

  async function sendSms() {
    try {
      if (phone) {
        setText("...");
        await AuthService.sendSms(phone);
        setText("");
        setStep(1);
      }
    } catch (e) {
      setText("Le serveur est injoignable pour le moment.");
    }
  }

  async function login() {
    try {
      if (code) {
        const user = await AuthService.login(phone, code);
        setAuthUser(user);
      }
    } catch (e) {
      setText("Impossible de vous enregistrer.");
    }
  }

  return (
    <div className="flex items-center h-screen font-sans">
      { !(authUser)
        ? (
          <div className="m-auto p-4">
            <img className="m-auto w-[3.23rem]" src="/images/logo.png" alt="Liane logo" />
            <div className="p-6 grid">
              <TextInput
                type="text"
                iconLeft="cellphone"
                placeholder="Numéro de téléphone"
                onChange={setPhone}
              />
              <Button
                className="ml-10 mr-10"
                label="Recevoir le code"
                color="orange"
                onClick={sendSms}
              />
            </div>
            {step > 0
            && (
            <div className="p-6 grid">
              <TextInput
                type="text"
                iconLeft="key-variant"
                placeholder="Code d'authentification"
                onChange={setCode}
              />
              <Button
                className="ml-10 mr-10"
                label="Valider"
                color="orange"
                onClick={login}
              />
            </div>
            )}
            { text && <div className="text-center bold">{text}</div> }
          </div>
        )
        : (
          <div className="m-auto p-4 rounded-lg grid">
            Vous êtes connecté avec :
            {" "}
            {authUser.phone}
            .
            <br />
            <Button
              className="mt-5 ml-10 mr-10"
              label="Retour à l'accueil"
              color="orange"
              href="/"
            />
          </div>
        )}
    </div>
  );
}
