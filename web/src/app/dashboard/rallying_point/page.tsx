"use client";
import React, { useMemo, useState } from "react";
import { Button, Card, Select } from "flowbite-react";
import { departements } from "@/api/osm";
import { useRouter } from "next/navigation";
import { useAppServices } from "@/components/ContextProvider";

export default function RallyingPointsPage() {
  const router = useRouter();
  const departments = useMemo(() => Object.entries(departements).sort((a, b) => a[0].localeCompare(b[0])), []);
  const [dpt, setDpt] = useState<(typeof departements)[string]>(departments[0][0]);
  const { rallyingPoint } = useAppServices();
  return (
    <div className="h-full w-full relative flex flex-col gap-4 items-center justify-center">
      <Card>
        <div>
          <h1>Veuillez choisir un département:</h1>
        </div>
        <div className="flex flex-col gap-4 items-center">
          <Select className="max-h-24" value={dpt} onChange={v => setDpt(v.target.value)}>
            {departments.map(([k, name]) => (
              <option value={k} key={k}>
                {k} - {name}
              </option>
            ))}
          </Select>
          <Button gradientDuoTone="pinkToOrange" onClick={() => router.push("/dashboard/rallying_point/" + dpt)}>
            Accéder à la carte
          </Button>
        </div>
      </Card>
      ou
      <Card>
        <Button
          gradientDuoTone="pinkToOrange"
          onClick={() => {
            downloadFile(() => rallyingPoint.exportCsv(), "rallying_points.csv");
          }}>
          Exporter les points
        </Button>
      </Card>
    </div>
  );
}

const downloadFile = (queryFn: () => Promise<Blob>, fileName: string) => {
  queryFn().then(blob => {
    const url = window.URL.createObjectURL(new Blob([blob]));

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);

    link.click();

    link.parentNode?.removeChild(link);
  });
};
