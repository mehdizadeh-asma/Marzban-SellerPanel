"use client";
import type { ComponentRef, ReactElement } from "react";
import { useCallback, useRef, useState } from "react";

import type { AlertColor } from "@mui/material";

import dynamic from "next/dynamic";

import { useSellers } from "@/hooks/useSellers";
import type SellerType from "@/models/SellerType";

import Messages from "../General/Messages";
import AddSeller, { type AddSellerHandle } from "./AddSeller";
import EditModal from "./EditModal";
import SellerGrid from "./SellerGrid";

const PackageSellerModal = dynamic(() => import("./PackageSellerModal"));

const SellerManagement = (): ReactElement | null => {
  const [selectedSeller, setSelectedSeller] = useState<SellerType | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isAssignPackagesModalOpen, setAssignPackagesModalOpen] = useState(false);

  type MessagesHandle = ComponentRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  const addSellerRef = useRef<AddSellerHandle | null>(null);

  const notify = useCallback((severity: AlertColor, text: string): void => {
    refMessages.current?.Show(severity, text);
  }, []);

  const { sellers, loading, addSeller, updateSeller, deleteSeller, disableSeller, assignPackages } =
    useSellers({
      onMessage: notify,
      onAddSuccess: () => addSellerRef.current?.resetFields(),
      onUpdateSettled: () => {
        setSelectedSeller(null);
        setEditModalOpen(false);
      },
    });

  const resetAddSellerFields = (): void => {
    addSellerRef.current?.resetFields();
  };

  const onEditClick = (seller: SellerType): void => {
    resetAddSellerFields();
    setSelectedSeller(seller);
    setEditModalOpen(true);
  };

  const onUpdateClick = (seller: SellerType): void => {
    updateSeller(seller);
  };

  const onAddClick = (seller: SellerType): void => {
    addSeller(seller);
  };

  const onDeleteClick = (seller: SellerType): void => {
    deleteSeller(seller);
  };

  const onDisableAccountClick = (seller: SellerType): void => {
    disableSeller(seller);
  };

  const onAssignPackagesClick = (seller: SellerType): void => {
    setSelectedSeller(seller);
    setAssignPackagesModalOpen(true);
  };

  const onSavePackageClick = (seller: SellerType, packagesListIds: string[]): void => {
    assignPackages(seller, packagesListIds);
  };

  return (
    <div className="row w-100 border border-solid-1 border-secondary.light rounded py-2">
      <div className="col-12">
        <Messages ref={refMessages}></Messages>
        <AddSeller ref={addSellerRef} onAdding={onAddClick}></AddSeller>
        <SellerGrid
          Sellers={sellers}
          Loading={loading}
          onDeleting={onDeleteClick}
          onEditing={onEditClick}
          onDisableAccount={onDisableAccountClick}
          onAssignPackages={onAssignPackagesClick}
        />
      </div>
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedSeller(null);
        }}
        seller={selectedSeller}
        onEditing={onUpdateClick}
      />
      {selectedSeller != null ? (
        <PackageSellerModal
          isOpen={isAssignPackagesModalOpen}
          onClose={() => setAssignPackagesModalOpen(false)}
          seller={selectedSeller}
          onAssign={onSavePackageClick}
          onMessage={notify}
        />
      ) : (
        ""
      )}
    </div>
  );
};

export default SellerManagement;
