import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RallyingPoint, RallyingPointLocationLabels, RallyingPointLocationTypes, RallyingPointPropertiesLabels, Address } from "@liane/common";
import { Alert, Button, ButtonProps, Select, Table, ToggleSwitch } from "flowbite-react";
import { useAppServices } from "@/components/ContextProvider";
import { useQuery } from "@tanstack/react-query";
import { useLocalization } from "@/api/intl";
import { FormProvider, useController, useForm } from "react-hook-form";
import { TextInput, TextInputProps } from "@/components/forms/TextInput";
import { HiInformationCircle } from "react-icons/hi";
import { LatLng } from "@liane/common/src";

type Props = {
  point: Partial<RallyingPoint> & { isNew?: boolean };
  position?: LatLng;
  onSave?: () => void;
  onClose?: () => void;
};

const TextField = ({ name, readOnly, ...props }: { name: string; readOnly?: boolean } & Omit<TextInputProps, "id">) => {
  const { field } = useController({ name });
  const initialValue = useRef(field.value);
  return (
    <div className="flex-1">
      {/* @ts-ignore */}
      <span className={`text-sm ${readOnly && "text-gray-500"}`}>{RallyingPointPropertiesLabels[name]}</span>
      <TextInput {...props} disabled={readOnly && !!initialValue.current} onChange={field.onChange} value={field.value} id={name} name={name} />
    </div>
  );
};

const SelectInput = ({ name, options }: { name: string; options: string[] }) => {
  const { field } = useController({ name });
  return (
    <div className="flex-1">
      {/* @ts-ignore */}
      <span className="text-sm">{RallyingPointPropertiesLabels[name]}</span>
      <Select value={field.value} onChange={field.onChange} id={name} name={name}>
        {options.map(o => (
          // @ts-ignore
          <option key={o} label={RallyingPointLocationLabels[o]}>
            {o}
          </option>
        ))}
      </Select>
    </div>
  );
};

const CheckBoxInput = ({ name }: { name: string }) => {
  const { field } = useController({ name });
  return (
    <div className="flex-1 gap-2 flex items-center justify-center">
      <ToggleSwitch checked={field.value ?? false} onChange={field.onChange} id={name} name={name} />
      <span className="text-sm">{RallyingPointPropertiesLabels[name]}</span>
    </div>
  );
};

export const RallyingPointEdition = ({ point, position, onClose, onSave }: Props) => {
  const WebLocalization = useLocalization();
  const { rallyingPoint, address: s } = useAppServices();

  const [reverseAddress, setReverseAddress] = useState<Address>();

  useEffect(() => {
    if (!position) {
      return;
    }
    s.getAddress(position).then(r => setReverseAddress(r.address));
  }, [s, position]);

  const methods = useForm<Partial<RallyingPoint>>({
    mode: "onChange",
    values: {
      ...point,
      city: reverseAddress?.city ?? point.city,
      location: position ?? point.location
    }
  });
  const { isDirty, isValid } = useMemo(() => methods.formState, [methods.formState]);

  const { data } = useQuery({
    enabled: !!point.id,
    queryFn: () => rallyingPoint.getStats(point.id!),
    queryKey: ["stats", point.id]
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(async () => {
    if (point.isNew) {
      await rallyingPoint.deleteRequest(point.id!);
    } else {
      await rallyingPoint.delete(point.id!);
    }
    onSave && onSave();
    onClose && onClose();
  }, [onClose, onSave, point.id, point.isNew, rallyingPoint]);

  return (
    <FormProvider {...methods}>
      <div className="flex flex-col justify-start gap-8">
        <div className="flex gap-4">
          {point.id && <TextField name="id" readOnly />}
          <TextField name="label" required />
        </div>
        <div className="flex gap-4">
          <TextField name="city" required />
          <TextField name="zipCode" required />
        </div>
        <div className="flex gap-4">
          <TextField name="address" />
          <TextField name="placeCount" required type="number" min={0} />
        </div>
        <div>
          <div className="flex gap-4">
            <TextField name="location.lat" type="string" required />
            <TextField name="location.lng" type="string" required />
          </div>
          <div className="text-lime-500 text-sm pt-2">
            <span className="font-bold">Ctrl</span> + <span className="font-bold">Click</span> sur la carte pour changer la position
          </div>
        </div>
        <div className="flex gap-4 items-center justify-center">
          <SelectInput name="type" options={[...RallyingPointLocationTypes]} />
          <CheckBoxInput name="isActive" />
        </div>
        <div>
          <Table hoverable>
            <Table.Head>
              <Table.HeadCell>Dernier usage</Table.HeadCell>
              <Table.HeadCell>Trajets totaux</Table.HeadCell>
            </Table.Head>
            <Table.Body>
              <Table.Row>
                <Table.Cell>{data?.lastTripUsage ? WebLocalization.formatDateTime(new Date(data?.lastTripUsage)) : "Aucun"}</Table.Cell>
                <Table.Cell>{data?.totalTripCount ?? 0}</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </div>
        {!confirmDelete && (
          <div className="flex flex-row gap-2 justify-center">
            <ButtonWithLoadingAction
              disabled={!position && !point.isNew && (!isDirty || !isValid)}
              color={point.isNew ? "green" : "blue"}
              action={methods.handleSubmit(
                async p => {
                  let action: () => Promise<void>;
                  if (point.isNew) {
                    action = async () => {
                      // @ts-ignore
                      await rallyingPoint.create(p);
                      // @ts-ignore
                      await rallyingPoint.deleteRequest(p.id);
                    };
                  } else {
                    if (point.id) {
                      // @ts-ignore
                      action = () => rallyingPoint.update(point.id, p);
                    } else {
                      // @ts-ignore
                      action = () => rallyingPoint.create(p);
                    }
                  }
                  await action();
                  onSave && onSave();
                },
                err => {
                  console.warn(err);
                }
              )}>
              {point.isNew ? "Créer" : "Enregistrer"}
            </ButtonWithLoadingAction>
            {point.id && (
              <Button color="red" onClick={() => setConfirmDelete(true)}>
                {point.isNew ? "Supprimer la demande" : "Supprimer"}
              </Button>
            )}
            <Button onClick={() => onClose && onClose()} color="gray">
              Annuler
            </Button>
          </div>
        )}
        {confirmDelete && (
          <Alert
            additionalContent={<ExampleAdditionalContent isNew={point.isNew} onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />}
            color="warning"
            icon={HiInformationCircle}>
            {point.isNew ? "Suppression de la demande" : "Suppression du point de ralliement"}
          </Alert>
        )}
      </div>
    </FormProvider>
  );
};

const ButtonWithLoadingAction = ({ onClick, action, ...props }: ButtonProps & { action: () => Promise<any | void> }) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      {...props}
      isProcessing={loading}
      onClick={() => {
        setLoading(true);
        action().finally(() => setLoading(false));
      }}></Button>
  );
};

type ExampleAdditionalContentProps = {
  isNew?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ExampleAdditionalContent({ isNew, onConfirm, onCancel }: ExampleAdditionalContentProps) {
  return (
    <>
      <div className="mb-4 mt-2 text-sm text-cyan-700 dark:text-cyan-800">
        {isNew
          ? "Vous allez supprimer la demande de point de ralliement, êtes-vous sûr(e) ?"
          : "Vous allez supprimer le point de ralliement, êtes-vous sûr(e) ?"}
      </div>
      <div className="flex">
        <button
          type="button"
          className="mr-2 inline-flex items-center rounded-lg bg-cyan-700 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-cyan-800 focus:ring-4 focus:ring-cyan-300 dark:bg-cyan-800 dark:hover:bg-cyan-900"
          onClick={() => onConfirm()}>
          Confirmer
        </button>
        <button
          type="button"
          className="rounded-lg border border-cyan-700 bg-transparent px-3 py-1.5 text-center text-xs font-medium text-cyan-700 hover:bg-cyan-800 hover:text-white focus:ring-4 focus:ring-cyan-300 dark:border-cyan-800 dark:text-cyan-800 dark:hover:text-white"
          onClick={() => onCancel()}>
          Annuler
        </button>
      </div>
    </>
  );
}
