import { useEffect, useState, useRef } from "react";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import type { Artwork } from "../types/ArtProduct";
import axios from "axios";
import { Button } from "primereact/button";
import { OverlayPanel } from "primereact/overlaypanel";
import { InputNumber } from "primereact/inputnumber";
import { ProgressSpinner } from "primereact/progressspinner";

const ArtworkTable: React.FC = () => {
  const [tableData, setTableData] = useState<Artwork[]>([]);
  const [totalArtworkCount, setTotalArtworkCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: Artwork }>({});
  const [rowsToSelect, setRowsToSelect] = useState<number>(0);

  const rowsPerPage = 12;
  const overlayRef = useRef<OverlayPanel>(null);

  const fetchArtworks = async (pageNumber: number) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://api.artic.edu/api/v1/artworks?page=${pageNumber + 1}&limit=${rowsPerPage}`
      );
      setTableData(response.data.data);
      setTotalArtworkCount(response.data.pagination.total);
    } catch (err) {
      console.error("Error in fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArtworks(currentPage);
  }, [currentPage]);

  const onPage = (e: DataTablePageEvent) => {
    setCurrentPage(e.page ?? 0);
  };

  const handleSelectionChange = (e: { value: Artwork[] }) => {
    const updatedSelection = { ...selectedItems };
    e.value.forEach((art) => {
      updatedSelection[art.id] = art;
    });
    tableData.forEach((art) => {
      const stillSelected = e.value.find((a) => a.id === art.id);
      if (!stillSelected) {
        delete updatedSelection[art.id];
      }
    });
    setSelectedItems(updatedSelection);
  };

  const selectedOnCurrentPage = tableData.filter((art) => selectedItems[art.id]);

  const handleSelectRowsSubmit = async () => {
    const updated = { ...selectedItems };
    let selectedCount = Object.keys(updated).length;
    let tempPage = 0;
    const maxPages = Math.ceil(totalArtworkCount / rowsPerPage);

    while (selectedCount < rowsToSelect && tempPage < maxPages) {
      const requests = [];

      for (let i = 0; i < 3 && tempPage < maxPages; i++, tempPage++) {
        requests.push(
          axios.get(
            `https://api.artic.edu/api/v1/artworks?page=${tempPage + 1}&limit=${rowsPerPage}`
          )
        );
      }

      const results = await Promise.all(requests);

      for (const res of results) {
        const data: Artwork[] = res.data.data;
        for (let i = 0; i < data.length && selectedCount < rowsToSelect; i++) {
          if (!updated[data[i].id]) {
            updated[data[i].id] = data[i];
            selectedCount++;
          }
        }
        if (selectedCount >= rowsToSelect) break;
      }
    }

    setSelectedItems(updated);
    overlayRef.current?.hide();
  };

  const customChevronColumn = (
    <Button
      icon="pi pi-chevron-down"
      className="p-button-text"
      onClick={(e) => overlayRef.current?.toggle(e)}
      tooltip="Custom row select"
    />
  );

  return (
    <div>
      <div className="mb-3 text-center">
        <h3>Selected Artworks: {Object.keys(selectedItems).length}</h3>
      </div>

      {isLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(255, 255, 255, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div className="text-center">
            <ProgressSpinner style={{ width: "60px", height: "60px" }} strokeWidth="4" animationDuration=".5s" />
            <p style={{ marginTop: "1rem", fontSize: "1.2rem", fontWeight: "500", color: "#2e7d32" }}>
              Fetching artworks...
            </p>
          </div>
        </div>
      )}

      <OverlayPanel ref={overlayRef} showCloseIcon>
        <div className="p-2" style={{ minWidth: "205px" }}>
          <h4>Select no. of Rows</h4>
          <InputNumber
            className="mb-2"
            placeholder="Enter number of rows"
            value={rowsToSelect}
            onValueChange={(e) => setRowsToSelect(e.value ?? 0)}
            showButtons
            min={1}
            max={totalArtworkCount}
          />
          <br />
          <Button label="Submit" onClick={handleSelectRowsSubmit} />
        </div>
      </OverlayPanel>

      <DataTable
        className="artwork-table-wrapper"
        value={tableData}
        selection={selectedOnCurrentPage}
        rows={rowsPerPage}
        totalRecords={totalArtworkCount}
        loading={false}
        first={currentPage * rowsPerPage}
        onSelectionChange={handleSelectionChange}
        onPage={onPage}
        selectionMode="multiple"
        dataKey="id"
        lazy
        paginator
      >
        <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
        <Column header={customChevronColumn} body={() => null} headerStyle={{ width: "3rem" }} />
        <Column field="title" header="Title" />
        <Column field="place_of_origin" header="Origin" />
        <Column field="artist_display" header="Artist" />
        <Column field="inscriptions" header="Inscriptions" />
        <Column field="date_start" header="Start-Date" />
        <Column field="date_end" header="End-Date" />
      </DataTable>
    </div>
  );
};

export default ArtworkTable;
