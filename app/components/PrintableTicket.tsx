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
// COMENTADO: Función de impresión por endpoint
// interface PrintData {
//   sale: Sale;
//   businessData?: BusinessData;
//   rubro: Rubro;
//   formattedDate: string;
//   invoiceNumber?: string;
// }

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

    // COMENTADO: Función de impresión por endpoint
    /*
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
    */

    const printTicket = async (): Promise<void> => {
      try {
        // COMENTADO: Ya no se usa el endpoint de impresión
        // await sendToPrintEndpoint();

        // Siempre usar impresión del navegador
        printWithBrowserDialog();
      } catch (error) {
        console.error("Error en el proceso de impresión:", error);
        // En caso de error, igualmente usar el diálogo del navegador
        printWithBrowserDialog();
      }
    };

    const printStyles = `
      @media print {
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body { 
          font-family: 'Courier New', monospace !important; 
          font-size: 12px !important; 
          width: 57mm !important; 
          margin: 0 !important; 
          padding: 10px !important;
          line-height: 1.2 !important;
        }
        .center { text-align: center !important; }
        .bold, .font-bold, .font-semibold { 
          font-weight: bold !important; 
        }
        .text-right { text-align: right !important; }
        .border-bottom, .border-b { 
          border-bottom: 1px solid #000 !important; 
        }
        .border-top, .border-t { 
          border-top: 1px solid #000 !important; 
        }
        .border-gray-200 { 
          border-bottom: 1px solid #d1d5db !important; 
        }
        .mt-2 { margin-top: 8px !important; }
        .mt-4 { margin-top: 16px !important; }
        .mb-2 { margin-bottom: 8px !important; }
        .mb-4 { margin-bottom: 16px !important; }
        .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
        .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
        .pt-2 { padding-top: 8px !important; }
        .pb-4 { padding-bottom: 16px !important; }
        .ml-2 { margin-left: 8px !important; }
        .flex { display: flex !important; }
        .flex-1 { flex: 1 !important; }
        .justify-between { justify-content: space-between !important; }
        .items-start { align-items: flex-start !important; }
        .text-center { text-align: center !important; }
        .text-sm { font-size: 14px !important; }
        .text-\[0\.7rem\] { font-size: 11px !important; }
        .space-y-1 > * + * { margin-top: 4px !important; }
        .max-h-\[66vh\] { max-height: none !important; }
        .overflow-y-auto { overflow: visible !important; }
        .w-\[57mm\] { width: 57mm !important; }
        .mx-auto { margin-left: auto !important; margin-right: auto !important; }
        .bg-white { background: white !important; }
        .text-gray_b { color: #4b5563 !important; }
        .text-gray-600 { color: #6b7280 !important; }
        .text-gray_m { color: #6b7280 !important; }
        .text-red_b { color: #dc2626 !important; }
        .discount { color: #666 !important; font-size: 10px !important; }
        .uppercase { text-transform: uppercase !important; }
      }
    `;

    const printWithBrowserDialog = () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      // Obtener el HTML del ticket
      const ticketHTML = ticketRef.current?.innerHTML || "";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket ${calculatedInvoiceNumber}</title>
            <meta charset="utf-8">
            <style>
              ${printStyles}
              
              /* Estilos específicos para impresión */
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                width: 57mm; 
                margin: 0 auto; 
                padding: 10px;
                line-height: 1.2;
                background: white;
                color: black;
              }
              
              /* Forzar estilos que puedan perderse */
              .ticket-container * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              
              /* Estilos específicos para bordes */
              .border-force {
                border: 1px solid #000 !important;
              }
              
              .border-bottom-force {
                border-bottom: 1px dotted #000 !important;
              }
              
              .border-top-force {
                border-top: 1px solid #000 !important;
              }
              
              /* Asegurar que los textos se centren */
              .text-center-force {
                text-align: center !important;
              }
              
              /* Asegurar negritas */
              .bold-force {
                font-weight: bold !important;
              }
            </style>
          </head>
          <body>
            <div class="ticket-container">
              ${ticketHTML}
            </div>
            
            <script>
              // Esperar a que cargue el contenido antes de imprimir
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    window.close();
                  }, 100);
                }, 250);
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();

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
      <div className="max-h-[66vh]  overflow-y-auto ">
        <div
          ref={ticketRef}
          className="ticket-container p-2 pb-4 w-[57mm] mx-auto font-mono text-[0.7rem] bg-white text-gray_b"
          style={{
            fontFamily: "'Courier New', monospace",
            lineHeight: 1.2,
          }}
        >
          {/* Encabezado del negocio */}
          <div className="mb-4 text-center-force">
            <h2 className="text-center font-bold text-sm mb-1 bold-force center">
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
          <div className="border-bottom border-black py-1 mb-2 border-bottom-force">
            <p className="font-bold bold-force">
              TICKET #{calculatedInvoiceNumber}
            </p>
            <p>{fecha}</p>
            {/* Información del cliente */}
            {shouldShowCustomerInfo() && (
              <div className="py-2 border-b border-black">
                <p className="font-semibold">Cliente: {sale.customerName}</p>
              </div>
            )}
          </div>

          <div className="mb-2">
            {invoiceItems.map((item, index) => (
              <div
                key={index}
                className="border-bottom border-gray-200 py-1 border-bottom-force"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="font-semibold">{item.description}</span>
                    <div className="text-[0.7rem] text-gray-800">
                      x{item.quantity} {item.unit}{" "}
                      <span className="text-[0.5rem]">
                        ({formatCurrency(item.price)}
                      </span>
                      )
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="font-semibold">
                      {formatCurrency(item.subtotal)}
                    </div>
                    {/* Mostrar descuento debajo del total */}
                    {item.discount && item.discount > 0 && (
                      <div className="text-[0.7rem] text-gray_m discount">
                        desc. {item.discount}%
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
      </div>
    );
  }
);

PrintableTicket.displayName = "PrintableTicket";

export default PrintableTicket;
