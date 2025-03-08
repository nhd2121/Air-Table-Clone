import React from "react";
import { HydrateClient } from "@/trpc/server";
import { BaseNavbar } from "../_components/baseNavBar";
import TableComponent from "../_components/TableComponent";

export default async function BasePage() {
  return (
    <HydrateClient>
      <div className="w-full">
        <BaseNavbar />
        <div className="container px-4 py-4">
          <TableComponent />
        </div>
      </div>
    </HydrateClient>
  );
}
