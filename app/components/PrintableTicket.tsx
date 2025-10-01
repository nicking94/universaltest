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
  // Props opcionales simplificadas
  invoiceNumber?: string;
};

export type PrintableTicketHandle = {
  print: () => Promise<void>;
};

interface PrintData {
  sale: Sale;
  businessData?: BusinessData;
  rubro: Rubro;
  formattedDate: string;
  invoiceNumber?: string;
}

const PrintableTicket = forwardRef<PrintableTicketHandle, PrintableTicketProps>(
  (
    { sale, rubro, businessData, onPrint, autoPrint = false, invoiceNumber },
    ref
  ) => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const fecha = format(parseISO(sale.date), "dd/MM/yyyy HH:mm", {
      locale: es,
    });

    // Calcular número de factura si no se proporciona
    const calculatedInvoiceNumber =
      invoiceNumber ?? `${sale.id.toString().padStart(3, "0")}`;

    // Función para calcular el precio con descuento
    const calculateDiscountedPrice = (
      price: number,
      quantity: number,
      discount?: number
    ): number => {
      if (!discount) return price * quantity;
      return price * quantity * (1 - discount / 100);
    };

    // Convertir productos Sale al formato de items simplificado
    const getInvoiceItems = () => {
      return sale.products.map((product) => {
        const subtotalSinDescuento = product.price * product.quantity;
        const subtotalConDescuento = calculateDiscountedPrice(
          product.price,
          product.quantity,
          product.discount
        );

        return {
          description: getDisplayProductName(product, rubro),
          quantity: product.quantity,
          price: product.price,
          subtotal: subtotalConDescuento,
          unit: product.unit,
          discount: product.discount,
          subtotalSinDescuento: subtotalSinDescuento,
          ahorro: subtotalSinDescuento - subtotalConDescuento,
        };
      });
    };

    const invoiceItems = getInvoiceItems();

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
          invoiceNumber: calculatedInvoiceNumber,
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
            <title>Ticket ${calculatedInvoiceNumber}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                width: 57mm; 
                margin: 0; 
                padding: 10px;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .text-right { text-align: right; }
              .border-bottom { border-bottom: 1px dashed #000; }
              .mt-2 { margin-top: 8px; }
              .discount { color: #666; font-size: 10px; }
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
        className="max-h-[66vh] overflow-y-auto p-2 pb-4 w-[57mm] mx-auto font-mono text-[0.7rem] bg-white text-gray_b"
        style={{
          fontFamily: "'Courier New', monospace",
          lineHeight: 1.2,
        }}
      >
        {/* Encabezado del negocio */}
        <div className="mb-4">
          <h2 className="text-center font-bold text-sm mb-1">
            {businessData?.name || "Universal App"}
          </h2>
          <p className="text-[0.7rem]">
            {businessData?.address || "Calle Falsa 123"}
          </p>
          <p className="text-[0.7rem]">
            Tel: {businessData?.phone || "123-456789"}
          </p>
          <p className="text-[0.7rem]">
            CUIT: {businessData?.cuit || "12-34567890-1"}
          </p>
        </div>

        {/* Información del ticket */}
        <div className="border-b border-black py-1 mb-2">
          <p className="font-bold">TICKET #{calculatedInvoiceNumber}</p>
          <p>{fecha}</p>
          {/* Información del cliente */}
          {shouldShowCustomerInfo() && (
            <div className="py-2">
              <p className="font-semibold">Cliente: {sale.customerName}</p>
              {sale.customerPhone && (
                <p className="text-[0.7rem]">Tel: {sale.customerPhone}</p>
              )}
            </div>
          )}
        </div>

        {/* Items del ticket */}
        <div className="mb-2">
          {invoiceItems.map((item, index) => (
            <div key={index} className="border-b border-gray-200 py-1">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="font-semibold">{item.description}</span>
                  <div className="text-[0.7rem] text-gray-600">
                    {item.quantity} {item.unit} x {formatCurrency(item.price)}
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="font-semibold">
                    {formatCurrency(item.subtotal)}
                  </div>
                  {/* Mostrar descuento debajo del total */}
                  {item.discount && item.discount > 0 && (
                    <div className="text-[0.7rem] text-gray_m discount">
                      descuento: {item.discount}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Monto manual si existe */}
        {sale.manualAmount !== undefined && sale.manualAmount > 0 && (
          <div className="mt-2  pt-2">
            <div className="flex justify-between">
              <span className="uppercase font-semibold">Monto Manual:</span>
              <span>{formatCurrency(sale.manualAmount)}</span>
            </div>
          </div>
        )}
        {sale.paymentMethods?.length > 0 && !sale.credit && (
          <div className="mb-2 mt-4 space-y-1 border-t border-gray_m pt-2">
            <span className="text-center font-semibold">Formas de pago</span>

            {sale.paymentMethods.map((method, idx) => (
              <div key={idx} className="flex justify-between text-[0.7rem]">
                <span>{method.method}:</span>
                <span>{formatCurrency(method.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="border-t border-black pt-2 mt-4">
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {/* Métodos de pago */}

        {sale.credit && (
          <div className="text-center font-bold text-red_b mb-2 border-t border-black pt-2">
            ** CUENTA CORRIENTE **
            {sale.customerName && <p>Cliente: {sale.customerName}</p>}
          </div>
        )}

        <div className="text-center mt-4 text-[0.7rem] border-t border-black pt-2">
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
