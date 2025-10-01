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
  invoiceNumber?: string;
};

export type PrintableTicketHandle = {
  print: () => Promise<void>;
};

const PrintableTicket = forwardRef<PrintableTicketHandle, PrintableTicketProps>(
  (
    { sale, rubro, businessData, onPrint, autoPrint = false, invoiceNumber },
    ref
  ) => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const fecha = format(parseISO(sale.date), "dd/MM/yyyy HH:mm", {
      locale: es,
    });

    const calculatedInvoiceNumber =
      invoiceNumber ?? `${sale.id.toString().padStart(3, "0")}`;

    const calculateDiscountedPrice = (
      price: number,
      quantity: number,
      discount?: number
    ): number => {
      if (!discount) return price * quantity;
      return price * quantity * (1 - discount / 100);
    };

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

    const printTicket = async (): Promise<void> => {
      printWithBrowserDialog();
    };

    const printStyles = `
      @media print {
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace !important;
          font-size: 12px !important;
          width: 57mm !important;
          margin: 0 !important;
          padding: 10px !important;
          line-height: 1.2 !important;
          background: white !important;
          color: black !important;
          overflow: visible !important;
          max-height: none !important;
        }
        .ticket-container {
          width: 57mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: white !important;
          overflow: visible !important;
          max-height: none !important;
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
        .border-bottom-dashed {
          border-bottom: 1px dashed #000 !important;
        }
        .border-top-dashed {
          border-top: 1px dashed #000 !important;
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
        .w-\[57mm\] { width: 57mm !important; }
        .mx-auto { margin-left: auto !important; margin-right: auto !important; }
        .bg-white { background: white !important; }
        .text-gray_b { color: #4b5563 !important; }
        .text-gray-600 { color: #6b7280 !important; }
        .text-gray_m { color: #6b7280 !important; }
        .text-red_b { color: #dc2626 !important; }
        .discount { color: #666 !important; font-size: 10px !important; }
        .uppercase { text-transform: uppercase !important; }
        
        /* Eliminar cualquier scroll o limitación de altura */
        .no-scroll {
          max-height: none !important;
          overflow: visible !important;
          height: auto !important;
        }
      }
      
      /* Estilos para pantalla */
      @media screen {
        .ticket-preview {
          max-height: 66vh;
          overflow-y: auto;
          width: 57mm;
          margin: 0 auto;
        }
      }
    `;

    const printWithBrowserDialog = () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      // Obtener el HTML limpio del ticket (solo el contenido interno)
      const ticketContent =
        ticketRef.current?.querySelector(".ticket-content")?.innerHTML || "";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket ${calculatedInvoiceNumber}</title>
            <meta charset="utf-8">
            <style>
              ${printStyles}
              
              /* Estilos base para la ventana de impresión */
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                width: 57mm;
                margin: 0 auto;
                padding: 10px;
                line-height: 1.2;
                background: white;
                color: black;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .ticket-container {
                width: 57mm;
                margin: 0 auto;
                background: white;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              
              /* Prevenir saltos de página dentro del ticket */
              .ticket-container * {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              
              .border-bottom-dashed {
                border-bottom: 1px dashed #000 !important;
              }
              
              .border-top-dashed {
                border-top: 1px dashed #000 !important;
              }
            </style>
          </head>
          <body>
            <div class="ticket-container no-scroll">
              ${ticketContent}
            </div>
            
            <script>
              // Esperar a que cargue el contenido antes de imprimir
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    window.close();
                  }, 500);
                }, 500);
              };
              
              // Fallback en caso de que onload falle
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  window.close();
                }, 500);
              }, 2000);
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
      // Contenedor para preview (solo en pantalla)
      <div className="ticket-preview">
        {/* Contenedor principal del ticket */}
        <div
          ref={ticketRef}
          className="ticket-container p-2 pb-4 w-[57mm] mx-auto font-mono text-[0.7rem] bg-white text-gray_b"
          style={{
            fontFamily: "'Courier New', monospace",
            lineHeight: 1.2,
          }}
        >
          {/* Contenido del ticket - este es el que se imprime */}
          <div className="ticket-content">
            {/* Encabezado del negocio */}
            <div className="mb-4 text-center">
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
                <div className="py-2 border-b border-black">
                  <p className="font-semibold">Cliente: {sale.customerName}</p>
                </div>
              )}
            </div>

            {/* Items del ticket */}
            <div className="mb-2">
              {invoiceItems.map((item, index) => (
                <div key={index} className="border-b border-gray-300 py-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="font-semibold">{item.description}</span>
                      <div className="text-[0.7rem] text-gray-600">
                        x{item.quantity} {item.unit}{" "}
                        <span className="text-[0.6rem]">
                          ({formatCurrency(item.price)})
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="font-semibold">
                        {formatCurrency(item.subtotal)}
                      </div>
                      {item.discount && item.discount > 0 && (
                        <div className="text-[0.7rem] text-gray-500">
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
              <div className="mt-2 pt-2">
                <div className="flex justify-between">
                  <span className="uppercase font-semibold">Monto Manual:</span>
                  <span>{formatCurrency(sale.manualAmount)}</span>
                </div>
              </div>
            )}

            {/* Formas de pago */}
            {sale.paymentMethods?.length > 0 && !sale.credit && (
              <div className="mb-2 mt-4 space-y-1 border-t border-gray-400 pt-2">
                <span className="text-center font-semibold block">
                  Formas de pago
                </span>
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

            {/* Cuenta corriente */}
            {sale.credit && (
              <div className="text-center font-bold text-red-600 mb-2 border-t border-black pt-2 mt-4">
                ** CUENTA CORRIENTE **
                {sale.customerName && <p>Cliente: {sale.customerName}</p>}
              </div>
            )}

            {/* Pie del ticket */}
            <div className="text-center mt-4 text-[0.7rem] border-t border-black pt-2">
              <p>¡Gracias por su compra!</p>
              <p>Conserve este ticket</p>
              <p>---</p>
              <p>Ticket no válido como factura</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PrintableTicket.displayName = "PrintableTicket";

export default PrintableTicket;
