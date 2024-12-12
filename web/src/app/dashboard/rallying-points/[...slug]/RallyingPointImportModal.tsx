import * as React from "react";
import { Button, Modal, Spinner } from "flowbite-react";
import { useEffect, useState } from "react";

import { useAppServices } from "@/components/ContextProvider";

type Props = {
  importingPoints: boolean;
  onClose: () => void;
};

export function RallyingPointImportModal({ onClose, importingPoints }: Props) {
  const [currentFile, setCurrentFile] = useState<null | File>();
  const [fileContent, setFileContent] = useState<null | string>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<null | string>();
  const { rallyingPoint } = useAppServices();
  const accept = ".csv,text/csv";
  useEffect(() => {
    if (currentFile) {
      let reader: FileReader = new FileReader();
      if (accept.indexOf(currentFile.type) <= 0) {
        console.error(new Error(`[strict mode] Accept type not respected: got '${currentFile.type}' but not in '${accept}'`));
        return;
      }

      reader.onload = (_event: Event) => {
        setFileContent(reader.result as string);
      };
      reader.onerror = err => {
        console.error(err);
        setError("Erreur lors de la lecture du fichier.");
      };

      reader.readAsText(currentFile, "utf-8");
    }
  }, [currentFile]);
  return (
    <Modal show={importingPoints} onClose={onClose} popup id="rallying_point_import">
      <Modal.Header />
      <Modal.Body>
        <div className="space-y-6">
          <h3 className="text-xl font-medium text-gray-800 dark:text-white">Importer des points de ralliement</h3>
          <p>Veuillez choisir un fichier au format CSV.</p>
          <form
            onSubmit={e => {
              if (!fileContent) return;
              setSubmitting(true);
              e.preventDefault();
              rallyingPoint
                .importCsv(fileContent)
                .catch(e => console.error(e))
                .finally(() => setSubmitting(false));
            }}>
            <div className="form-group">
              <input accept={accept} type="file" onChange={e => setCurrentFile(e.target.files?.[0])} />
            </div>
            {!!currentFile && !fileContent && <Spinner />}
            {/*!!fileContent && <span>{fileContent}</span>*/}
            {error}
            <div className="form-group my-2 flex-row justify-end w-full">
              <Button isProcessing={submitting} disabled={!currentFile || !fileContent} type="submit" gradientDuoTone="pinkToOrange">
                Importer
              </Button>
            </div>
          </form>
        </div>
      </Modal.Body>
    </Modal>
  );
}
