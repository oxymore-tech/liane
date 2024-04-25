import * as React from "react";
import { RallyingPoint, RallyingPointLocationLabels, RallyingPointLocationTypes, RallyingPointPropertiesLabels } from "@liane/common";
import { Button, ButtonProps, Select, Table } from "flowbite-react";
import { useAppServices } from "@/components/ContextProvider";
import { useQuery } from "@tanstack/react-query";
import { LoadingViewIndicator } from "@/components/base/LoadingViewIndicator";
import { useLocalization } from "@/api/intl";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useController, useForm } from "react-hook-form";
import { TextInput, TextInputProps } from "@/components/forms/TextInput";
import { RallyingPointFullRequest } from "@/api/api";

type SelectedPoint = RallyingPoint | Partial<Omit<RallyingPoint, "id">>;
type Props = {
  point: SelectedPoint;
  refresh: (id: string, value: RallyingPoint | null) => Promise<void>;
};

const isExistingRallyingPoint = (point: SelectedPoint): point is RallyingPoint => {
  return Object.hasOwn(point, "id");
};

export function RallyingPointEdition({ point, refresh }: Props) {
  const [editing, setEditing] = useState(!isExistingRallyingPoint(point));

  useEffect(() => {
    setEditing(!isExistingRallyingPoint(point));
  }, [point]);
  return (
    <div className="justify-between flex flex-col grow mb-8">
      {!editing && <Overview refresh={refresh} point={point as RallyingPoint} setEditing={setEditing} />}
      {editing && <Edition refresh={refresh} point={point} setEditing={setEditing} />}
    </div>
  );
}

export function RequestView({
  request,
  refresh
}: {
  request: RallyingPointFullRequest;
  refresh: (id: string, value: RallyingPoint | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const WebLocalization = useLocalization();
  return editing ? (
    <div className="justify-between flex flex-col grow mb-8">
      <div>
        <RallyingPointOverview point={request.point} />
        <span className="text-sm">Créé le {WebLocalization.formatDate(new Date(request.createdAt!))}</span>
      </div>
      <div
        className="flex flex-row gap-2"
        onClick={() => {
          setEditing(true);
        }}>
        <Button>Créer ce point de ralliement</Button>
      </div>
    </div>
  ) : (
    <Edition refresh={refresh} point={request.point} setEditing={setEditing} />
  );
}

const TextField = ({ name, readOnly, ...props }: { name: string; readOnly?: boolean } & Omit<TextInputProps, "id">) => {
  const { field } = useController({ name });
  const initialValue = useRef(field.value);
  return (
    <div>
      <span className="text-sm">{RallyingPointPropertiesLabels[name]}</span>
      <TextInput {...props} disabled={readOnly && !!initialValue.current} onChange={field.onChange} value={field.value} id={name} name={name} />
    </div>
  );
};

const SelectInput = ({ name, options }: { name: string; options: string[] }) => {
  const { field } = useController({ name });
  return (
    <div>
      <span className="text-sm">{RallyingPointPropertiesLabels[name]}</span>
      <Select value={field.value} onChange={field.onChange} id={name} name={name}>
        {options.map(o => (
          <option key={o} label={RallyingPointLocationLabels[o]}>
            {o}
          </option>
        ))}
      </Select>
    </div>
  );
};
const Edition = ({ point, setEditing, refresh }: Props & { setEditing: (e: boolean) => void }) => {
  const { rallyingPoint } = useAppServices();
  const methods = useForm<RallyingPoint>({
    //   mode: "onChange",
    defaultValues: point
  });

  return (
    <FormProvider {...methods}>
      <div className="gap-2 gap-x-4 grid grid-cols-2">
        <TextField name="id" readOnly={true} />
        <TextField name="label" />
        <TextField name="city" />
        <TextField name="zipCode" />
        <TextField name="address" />
        <TextField name="placeCount" type="number" min={0} />
        <SelectInput name="type" options={[...RallyingPointLocationTypes]} />
      </div>

      <div className="flex flex-row gap-2">
        <ButtonWithLoadingAction
          action={methods.handleSubmit(
            p => {
              let action: () => Promise<RallyingPoint>;
              if (isExistingRallyingPoint(point)) {
                action = () => rallyingPoint.update(point.id!, p);
              } else {
                action = () => rallyingPoint.create(p);
              }
              return action()
                .then(res => refresh(res.id!, res))
                .then(() => setEditing(false));
            },
            err => {
              console.warn(err);
            }
          )}>
          Enregistrer
        </ButtonWithLoadingAction>
        {isExistingRallyingPoint(point) && (
          <Button onClick={() => setEditing(false)} color="gray">
            Annuler
          </Button>
        )}
      </div>
    </FormProvider>
  );
};

const RallyingPointOverview = ({ point }: { point: RallyingPoint }) => {
  return (
    <Table hoverable>
      <Table.Head>
        {Object.keys(RallyingPointPropertiesLabels).map(key => (
          <Table.HeadCell key={key}>{RallyingPointPropertiesLabels[key as keyof RallyingPoint]}</Table.HeadCell>
        ))}
      </Table.Head>
      <Table.Body className="divide-y">
        <Table.Row key={point.id!} className="bg-white dark:border-gray-700 dark:bg-gray-800 cursor-pointer">
          {Object.keys(RallyingPointPropertiesLabels).map(key => (
            <Table.Cell key={key}>
              {key === "location" ? `${point.location.lat};${point.location.lng}` : point[key as keyof RallyingPoint]?.toString()}
            </Table.Cell>
          ))}
        </Table.Row>
      </Table.Body>
    </Table>
  );
};

const Overview = ({ point, setEditing, refresh }: { point: RallyingPoint } & Props & { setEditing: (e: boolean) => void }) => {
  const WebLocalization = useLocalization();
  const { rallyingPoint } = useAppServices();

  const { data, isLoading, error } = useQuery({
    enabled: !!point.id,
    queryFn: () => rallyingPoint.getStats(point.id!),
    queryKey: ["stats", point.id]
  });

  return (
    <>
      <div className="gap-2">
        <RallyingPointOverview point={point} />
        <div className="flex flex-col gap-2 p-4 mt-4">
          <h5 className="font-bold">Statistiques</h5>
          {isLoading && <LoadingViewIndicator />}
          {data && (
            <Table hoverable>
              <Table.Head>
                <Table.HeadCell>Dernier usage</Table.HeadCell>
                <Table.HeadCell>Trajets totaux</Table.HeadCell>
              </Table.Head>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>{data.lastTripUsage ? WebLocalization.formatDateTime(new Date(data.lastTripUsage)) : "Aucun"}</Table.Cell>
                  <Table.Cell>{data.totalTripCount}</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>
          )}
          {error && <span>Erreur lors de la requête</span>}
        </div>
      </div>
      <div className="flex flex-row gap-2">
        <Button onClick={() => setEditing(true)}>Modifier</Button>
        <ButtonWithLoadingAction
          action={async () => {
            const res = await rallyingPoint.update(point.id!, { ...point, isActive: !point.isActive });
            await refresh(point.id!, res);
          }}
          color="red">
          {point.isActive ? "Désactiver" : "Activer"}
        </ButtonWithLoadingAction>
      </div>
    </>
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
