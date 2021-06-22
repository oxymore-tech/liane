import React, { useContext, useState } from "react";
import { TextInput } from "@/components/base/TextInput";
import { Button } from "@/components/base/Button";
import { authService } from "@/api/auth-service";
import { AppContext } from "@/components/ContextProvider";

/**
 * Authentication form.
 */
export function AuthForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const { authUser, setAuthUser } = useContext(AppContext);

  async function sendSms() {
    try {
      if (phone) {
        await authService.sendSms(phone);
      }
    } catch (e) {
      setText("Impossible d'effectuer la demande");
    }
  }

  async function login() {
    try {
      if (code) {
        const user = await authService.login(phone, code);
        setAuthUser(user);
      }
    } catch (e) {
      setText("Impossible de vous enregistrer");
    }
  }

  return (
    <div className="flex h-screen font-sans">
      { !(authUser)
        ? (
          <div className="m-auto p-4 rounded-lg">
            <div className="p-6">
              <TextInput
                type="text"
                iconLeft="cellphone"
                placeholder="Numéro de téléphone"
                onChange={setPhone}
              />
              <Button
                className=""
                label="Recevoir le code"
                color="orange"
                onClick={sendSms}
              />
            </div>
            <div className="p-6">
              <TextInput
                type="text"
                iconLeft="key-variant"
                placeholder="Code d'authentification"
                onChange={setCode}
              />
              <Button
                label="Valider"
                color="orange"
                onClick={login}
              />
            </div>
            { text && <div>{text}</div> }
          </div>
        )
        : (
          <div className="m-auto p-4 rounded-lg">
            Vous êtes connecté avec :
            {" "}
            {authUser.phone}
            {" "}
            <br />
            <Button
              label="Retour à l'accueil"
              color="orange"
              href="/"
            />
          </div>
        )}
    </div>
  );
}
