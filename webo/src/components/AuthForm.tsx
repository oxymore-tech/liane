import React, { useContext, useState } from "react";
import { TextInput } from "@/components/base/TextInput";
import { Button } from "@/components/base/Button";
import { AuthService } from "@/api/services/auth-service";
import { AppContext } from "@/components/ContextProvider";

export function AuthForm() {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const { user, setUser } = useContext(AppContext);

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
        const authResponse = await AuthService.login(phone, code);
        setUser(authResponse.user);
        setText("Vous êtes maintenant authentifié.");
      }
    } catch (e) {
      console.log(e);
      setText("Impossible de vous enregistrer.");
    }
  }

  return (
    <div className="flex items-center h-screen font-sans">
      { !(user)
        ? (
          <div className="m-auto p-4">
            <img className="m-auto w-[3.23rem]" src="/images/logo.png" alt="Liane logo" />
            <div className="grid p-2">
              <TextInput
                type="text"
                iconLeft="cellphone"
                placeholder="Numéro de téléphone"
                onChange={setPhone}
              />
              <Button
                className="ml-4 mr-4"
                label="Recevoir le code"
                color="orange"
                onClick={() => sendSms()}
              />
            </div>
            {step > 0
            && (
            <div className="grid p-2">
              <TextInput
                type="text"
                iconLeft="key-variant"
                placeholder="Code d'authentification"
                onChange={setCode}
              />
              <Button
                className="ml-4 mr-4"
                label="Valider"
                color="orange"
                onClick={() => login()}
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
            {user.phone}
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
