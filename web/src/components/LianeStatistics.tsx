import React from "react";
import { Button } from "@/components/base/Button";
import { adminService } from "@/api/admin-service";

export function LianeStatistics() {
  return (
    <div className="absolute inset-y-0 left-8 z-10 overflow-scroll">
      <div className="bg-white w-96 shadow-xl bg-opacity-60 rounded-lg grid grid-cols-2 p-6 gap-2 m-6">
        <Button
          color="blue"
          className="mt-4 col-span-2"
          label="Re-générer les lianes"
          onClick={async () => { await adminService.generateLianes(); }}
        />
      </div>
    </div>
  );
}