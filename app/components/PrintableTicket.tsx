"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { BusinessData, Rubro, Sale } from "@/app/lib/types/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { formatCurrency } from "@/app/lib/utils/currency";

type PrintableTicketProps = {
  sale: Sale;
  rubro: Rubro;
  onPrint?: () => void;
  autoPrint?: boolean;
  businessData?: BusinessData;
};

export type PrintableTicketHandle = {
  print: () => Promise<void>;
};

interface PrintData {
  sale: Sale;
  businessData?: BusinessData;
  rubro: Rubro;
  formattedDate: string;
}

const PrintableTicket = forwardRef<PrintableTicketHandle, PrintableTicketProps>(
  ({ sale, rubro, businessData, onPrint, autoPrint = false }, ref) => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const fecha = format(parseISO(sale.date), "dd/MM/yyyy HH:mm", {
      locale: es,
    });

    const calculateDiscountedPrice = (
      price: number,
      quantity: number,
      discountPercent?: number
    ): number => {
      if (!discountPercent) return price * quantity;
      return price * quantity * (1 - discountPercent / 100);
    };

    const shouldShowCustomerInfo = (): boolean => {
      return Boolean(
        !sale.credit &&
          sale.customerName &&
          sale.customerName !== "CLIENTE OCASIONAL" &&
          sale.customerName.trim() !== ""
      );
    };

    const sendToPrintEndpoint = async (): Promise<void> => {
      try {
        const printData: PrintData = {
          sale,
          businessData,
          rubro,
          formattedDate: fecha,
        };

        const response = await fetch(process.env.NEXT_PUBLIC_PRINT!, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(printData),
        });

        if (!response.ok) {
          throw new Error(`Error en la impresión: ${response.statusText}`);
        }

        if (onPrint) {
          onPrint();
        }
      } catch (error) {
        console.error("Error al enviar datos al endpoint de impresión:", error);
        throw error;
      }
    };

    const printTicket = async (): Promise<void> => {
      try {
        await sendToPrintEndpoint();
      } catch (error) {
        console.error("Error en el proceso de impresión:", error);
        const shouldUseBrowserPrint = confirm(
          "No se pudo conectar con el servicio de impresión. ¿Deseas imprimir usando el diálogo estándar del navegador?"
        );

        if (shouldUseBrowserPrint) {
          printWithBrowserDialog();
        } else {
          throw error;
        }
      }
    };

    const printWithBrowserDialog = () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket de Venta</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                width: 80mm; 
                margin: 0; 
                padding: 10px;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
            </style>
          </head>
          <body>
            ${ticketRef.current?.innerHTML || ""}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.print();
      printWindow.close();

      if (onPrint) {
        onPrint();
      }
    };

    useImperativeHandle(ref, () => ({
      print: printTicket,
    }));

    useEffect(() => {
      if (autoPrint) {
        printTicket().catch(console.error);
      }
    }, [autoPrint]);

    return (
      <div
        ref={ticketRef}
        className="max-h-[66vh] overflow-y-auto p-2 pb-4 w-[80mm] mx-auto font-mono text-xs bg-white text-gray_b"
        style={{
          fontFamily: "'Courier New', monospace",
          lineHeight: 1.2,
        }}
      >
        <div className="mb-2">
          <h2 className="font-bold text-sm text-center mb-1">
            {businessData?.name || "Universal App"}
          </h2>
          <p>
            <span className="font-semibold">Dirección: </span>
            {businessData?.address || "Calle Falsa 123"}
          </p>
          <p>
            <span className="font-semibold">Tel: </span>
            {businessData?.phone || "123-456789"}
          </p>
          <p>
            <span className="font-semibold">CUIT: </span>
            {businessData?.cuit || "12-34567890-1"}
          </p>

          {shouldShowCustomerInfo() && (
            <p>
              <span className="font-semibold">Cliente: </span>
              {sale.customerName}
            </p>
          )}
        </div>

        <div className="py-1 border-b border-black ">
          <p className="font-bold">TICKET #{sale.id}</p>
          <p>{fecha}</p>
        </div>
        <div className="mb-2 mt-4">
          {sale.products.map((product, idx) => {
            const discountedPrice = calculateDiscountedPrice(
              product.price,
              product.quantity,
              product.discount
            );

            return (
              <div
                key={idx}
                className="flex justify-between items-center mb-1 border-b border-gray_xl"
              >
                <div className="flex items-center w-full gap-4">
                  <span className="font-bold w-24 text-xs text-[.8rem]">
                    {getDisplayProductName(product, rubro)}
                  </span>
                  <div className="flex flex-col text-center px-2 text-xs min-w-20">
                    {product.quantity} {product.unit?.toLowerCase() || "un"}
                    <span className="text-[.6rem]">($ {product.price})</span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span>{formatCurrency(discountedPrice)}</span>
                  {product.discount && (
                    <span className="text-xs text-gray-500">
                      (-{product.discount}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {sale.manualAmount === undefined ||
            (sale.manualAmount > 0 && (
              <div className="mt-4">
                <span className="w-full">
                  ---------------------------------------
                </span>
                <div className="flex justify-between">
                  <span className="uppercase font-semibold">Monto Manual:</span>
                  <span>{formatCurrency(sale.manualAmount)}</span>
                </div>
                <span className="w-full">
                  ---------------------------------------
                </span>
              </div>
            ))}
        </div>

        {sale.paymentMethods?.length > 0 && !sale.credit && (
          <div className="mb-2 mt-10 space-y-1">
            {sale.paymentMethods.map((method, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{method.method}:</span>
                <span>{formatCurrency(method.amount)}</span>
              </div>
            ))}
          </div>
        )}
        {sale.credit && (
          <div className="text-center font-bold text-red_b mb-2 border-t border-black pt-2">
            ** CUENTA CORRIENTE **
            {sale.customerName && <p>Cliente: {sale.customerName}</p>}
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-black pt-4">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
        <div className="text-center mt-4 text-xs border-t border-black pt-2">
          <p>¡Gracias por su compra!</p>
          <p>Conserve este ticket</p>
          <p>---</p>
          <p>Ticket no válido como factura</p>
        </div>
      </div>
    );
  }
);

PrintableTicket.displayName = "PrintableTicket";

export default PrintableTicket;
