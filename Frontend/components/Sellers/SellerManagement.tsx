"use client";
import axios, { AxiosError } from "axios";
import { ComponentRef, useCallback, useEffect, useRef, useState } from "react";

import { useMyContext } from "@/context/MyContext";
import SellerType from "@/models/SellerType";

import Messages from "../General/Messages";
import AddSeller from "./AddSeller";
import EditModal from "./EditModal";
import PackageSellerModal from "./PackageSellerModal";
import SellerGrid from "./SellerGrid";

const SellerManagement = () => {
  const { user, config } = useMyContext();
  const [sellerList, setSellerList] = useState<SellerType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerType | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isAssignPackagesModalOpen, setAssignPackagesModalOpen] = useState(false);

  type MessagesHandle = ComponentRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  type AddSellerHandle = {
    resetFields: () => void;
  };
  const addSellerRef = useRef<AddSellerHandle | null>(null);

  const LaodSeller = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("api/sellers", config.BACKEND_URL);
      const resultSellers = await axios.get(url.toString(), {
        headers: { Authorization: "Bearer " + user.Token },
      });
      setSellerList(resultSellers.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [config.BACKEND_URL, user.Token]);

  useEffect(() => {
    if (user.Token !== "") LaodSeller();
  }, [LaodSeller, user.Token]);

  const onDeleteClick = async (seller: SellerType) => {
    setLoading(true);
    try {
      const url = new URL("api/seller/" + seller._id, config.BACKEND_URL);

      await axios.delete(url.toString(), {
        headers: { Authorization: "Bearer " + user.Token },
      });
      refMessages.current?.Show("success", "Agent Delete Successful!");
    } catch (error) {
      console.log(error);
    } finally {
      LaodSeller();
    }
  };

  const resetAddSellerFields = () => {
    addSellerRef.current?.resetFields();
  };

  const onEditClick = (seller: SellerType) => {
    resetAddSellerFields();
    setSelectedSeller(seller);
    setEditModalOpen(true);
  };

  const onUpdateClick = async (seller: SellerType) => {
    setLoading(true);
    try {
      const url = new URL("api/seller/" + seller._id, config.BACKEND_URL);

      await axios.put(url.toString(), seller, {
        headers: { Authorization: "Bearer " + user.Token },
      });
      refMessages.current?.Show("success", "Agent Updated Successfully!");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          const statusCode = axiosError.response.status;

          if (statusCode === 404) {
            refMessages.current?.Show("error", "Invalid Marzban Account Information");
          }
        } else {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Update Failed, An error occurred";
          refMessages.current?.Show("error", errorMessage);
          refMessages.current?.Show("error", "No response from the server.");
        }
      } else {
        refMessages.current?.Show("error", "An unknown error occurred.");
      }
    } finally {
      setSelectedSeller(null);
      setEditModalOpen(false);
      LaodSeller();
    }
  };

  const onAddClick = async (seller: SellerType) => {
    setLoading(true);
    try {
      const url = new URL("api/seller", config.BACKEND_URL);

      await axios.post(url.toString(), seller, {
        headers: { Authorization: "Bearer " + user.Token },
      });
      refMessages.current?.Show("success", "Agent Inserted Successfully!");
      addSellerRef.current?.resetFields();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const statusCode = axiosError.response.status;

          if (statusCode === 404) {
            refMessages.current?.Show("error", "Invalid Marzban Account Information");
          } else {
            refMessages.current?.Show("error", "Internal Server Error! Please try again later.");
          }
        } else {
          refMessages.current?.Show("error", "No response from the server.");
        }
      } else {
        refMessages.current?.Show("error", "An unknown error occurred.");
      }
    } finally {
      LaodSeller();
    }
  };
  const onDisableAccountClick = async (seller: SellerType) => {
    setLoading(true);
    try {
      const url = new URL("api/disableseller/" + seller._id, config.BACKEND_URL);

      await axios.post(
        url.toString(),
        {},
        {
          headers: { Authorization: "Bearer " + user.Token },
        },
      );
      refMessages.current?.Show("success", "Agent Change Successful!");
    } catch (error) {
      console.log(error);
    } finally {
      LaodSeller();
    }
  };

  // #region AssignPackages
  const onAssignPackagesClick = async (seller: SellerType) => {
    setSelectedSeller(seller);
    setAssignPackagesModalOpen(true);
  };

  const onSavePackageClick = async (seller: SellerType, packagesListIds: string[]) => {
    setLoading(true);
    try {
      const url = new URL("api/tariffSeller/" + seller._id, config.BACKEND_URL);
      await axios.put(
        url.toString(),
        { TariffIds: packagesListIds },
        {
          headers: { Authorization: "Bearer " + user.Token },
        },
      );

      refMessages.current?.Show("success", "Packages Assigned to Seller Successfully!");
    } catch (error) {
      console.log(error);
      refMessages.current?.Show(
        "error",
        "An error occurred while assigning packages to the seller ",
      );
    } finally {
      setLoading(false);
      LaodSeller();
    }
  };
  //#endregion

  return (
    <div className="row w-100 border border-solid-1 border-secondary.light rounded py-2">
      <div className="col-12">
        <Messages ref={refMessages}></Messages>
        <AddSeller
          ref={addSellerRef}
          onAdding={onAddClick}
          onEditing={onEditClick}
          mode={"Add"}
          onFieldChange={() => {}}
        ></AddSeller>
        <SellerGrid
          Sellers={sellerList}
          Loading={loading}
          onDeleting={onDeleteClick}
          onEditing={onEditClick}
          onDisableAccount={onDisableAccountClick}
          onAssignPackages={onAssignPackagesClick}
        />
      </div>
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        seller={selectedSeller}
        onEditing={onUpdateClick}
      />
      {selectedSeller != null ? (
        <PackageSellerModal
          isOpen={isAssignPackagesModalOpen}
          onClose={() => setAssignPackagesModalOpen(false)}
          seller={selectedSeller}
          onAssign={onSavePackageClick}
        />
      ) : (
        ""
      )}
    </div>
  );
};

export default SellerManagement;
