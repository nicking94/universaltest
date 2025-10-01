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

// Comentado: ya no se necesita PrintData
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

    // Comentado: función de impresión por endpoint eliminada
    // const sendToPrintEndpoint = async (): Promise<void> => {
    //   try {
    //     const printData: PrintData = {
    //       sale,
    //       businessData,
    //       rubro,
    //       formattedDate: fecha,
    //       invoiceNumber: calculatedInvoiceNumber,
    //     };

    //     const response = await fetch(process.env.NEXT_PUBLIC_PRINT!, {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json",
    //       },
    //       body: JSON.stringify(printData),
    //     });

    //     if (!response.ok) {
    //       throw new Error(`Error en la impresión: ${response.statusText}`);
    //     }

    //     if (onPrint) {
    //       onPrint();
    //     }
    //   } catch (error) {
    //     console.error("Error al enviar datos al endpoint de impresión:", error);
    //     throw error;
    //   }
    // };

    // Función mejorada para capturar EXACTAMENTE lo que se ve en pantalla
    const getExactTicketHTML = (): string => {
      if (!ticketRef.current) return "";

      // Clonar el elemento para no modificar el original
      const clone = ticketRef.current.cloneNode(true) as HTMLElement;

      // Aplicar estilos inline para asegurar consistencia
      const elements = clone.querySelectorAll("*");
      elements.forEach((element) => {
        const el = element as HTMLElement;
        const computedStyle = window.getComputedStyle(el);

        // Aplicar estilos críticos inline
        el.style.fontFamily = computedStyle.fontFamily;
        el.style.fontSize = computedStyle.fontSize;
        el.style.textAlign = computedStyle.textAlign;
        el.style.fontWeight = computedStyle.fontWeight;
        el.style.margin = computedStyle.margin;
        el.style.padding = computedStyle.padding;
        el.style.border = computedStyle.border;
        el.style.display = computedStyle.display;
        el.style.flexDirection = computedStyle.flexDirection;
        el.style.justifyContent = computedStyle.justifyContent;
        el.style.alignItems = computedStyle.alignItems;
        el.style.width = computedStyle.width;
        el.style.lineHeight = computedStyle.lineHeight;
      });

      return clone.outerHTML;
    };

    const printTicket = async (): Promise<void> => {
      // Comentado: ya no se intenta imprimir por endpoint primero
      // try {
      //   await sendToPrintEndpoint();
      // } catch (error) {
      //   console.error("Error en el proceso de impresión:", error);
      //   const shouldUseBrowserPrint = confirm(
      //     "No se pudo conectar con el servicio de impresión. ¿Deseas imprimir usando el diálogo estándar del navegador?"
      //   );

      //   if (shouldUseBrowserPrint) {
      //     printWithBrowserDialog();
      //   } else {
      //     throw error;
      //   }
      // }

      // Ahora siempre usa la impresión por browser
      printWithBrowserDialog();
    };

    const printWithBrowserDialog = () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      // Usar la función mejorada para obtener el HTML exacto
      const exactHTML = getExactTicketHTML();

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket ${calculatedInvoiceNumber}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <style>
              /* Reset completo y estilos específicos para impresión */
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Courier New', Courier, monospace !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              @page {
                margin: 0 !important;
                padding: 0 !important;
                size: auto !important;
              }
              
              body { 
                font-family: 'Courier New', Courier, monospace !important; 
                font-size: 12px !important; 
                width: 57mm !important; 
                max-width: 57mm !important;
                min-width: 57mm !important;
                margin: 0 auto !important; 
                padding: 5px 8px !important;
                line-height: 1.2 !important;
                background: white !important;
                color: black !important;
                -webkit-text-size-adjust: none !important;
                text-size-adjust: none !important;
              }
              
              /* Media query para impresión */
              @media print {
                body {
                  width: 57mm !important;
                  max-width: 57mm !important;
                  min-width: 57mm !important;
                  margin: 0 !important;
                  padding: 5px 8px !important;
                  font-size: 12px !important;
                }
                
                .no-print {
                  display: none !important;
                }
                
                .break-before {
                  page-break-before: always !important;
                }
                
                .break-after {
                  page-break-after: always !important;
                }
                
                .break-inside-avoid {
                  page-break-inside: avoid !important;
                }
              }
              
              /* Clases específicas para replicar Tailwind - RESPONSIVAS */
              .text-center { 
                text-align: center !important; 
                display: block !important;
              }
              .text-left { 
                text-align: left !important; 
              }
              .text-right { 
                text-align: right !important; 
              }
              .font-bold { 
                font-weight: bold !important; 
              }
              .font-semibold { 
                font-weight: 600 !important; 
              }
              .mb-4 { 
                margin-bottom: 1rem !important; 
              }
              .mb-3 { 
                margin-bottom: 0.75rem !important; 
              }
              .mb-2 { 
                margin-bottom: 0.5rem !important; 
              }
              .mb-1 { 
                margin-bottom: 0.25rem !important; 
              }
              .mt-4 { 
                margin-top: 1rem !important; 
              }
              .mt-3 { 
                margin-top: 0.75rem !important; 
              }
              .mt-2 { 
                margin-top: 0.5rem !important; 
              }
              .mt-1 { 
                margin-top: 0.25rem !important; 
              }
              .py-1 { 
                padding-top: 0.25rem !important; 
                padding-bottom: 0.25rem !important; 
              }
              .py-2 { 
                padding-top: 0.5rem !important; 
                padding-bottom: 0.5rem !important; 
              }
              .pt-2 { 
                padding-top: 0.5rem !important; 
              }
              .pt-1 { 
                padding-top: 0.25rem !important; 
              }
              .pb-4 { 
                padding-bottom: 1rem !important; 
              }
              .pb-2 { 
                padding-bottom: 0.5rem !important; 
              }
              .p-2 { 
                padding: 0.5rem !important; 
              }
              .px-1 { 
                padding-left: 0.25rem !important; 
                padding-right: 0.25rem !important; 
              }
              .border-b { 
                border-bottom: 1px solid #000 !important; 
              }
              .border-t { 
                border-top: 1px solid #000 !important; 
              }
              .border-black { 
                border-color: #000 !important; 
              }
              .border-gray-200 { 
                border-color: #e5e7eb !important; 
              }
              .border-gray_m { 
                border-color: #6b7280 !important; 
              }
              .flex { 
                display: flex !important; 
              }
              .flex-col {
                flex-direction: column !important;
              }
              .flex-1 { 
                flex: 1 1 0% !important; 
                min-width: 0 !important;
              }
              .flex-wrap {
                flex-wrap: wrap !important;
              }
              .justify-between { 
                justify-content: space-between !important; 
              }
              .justify-start { 
                justify-content: flex-start !important; 
              }
              .items-start { 
                align-items: flex-start !important; 
              }
              .items-center { 
                align-items: center !important; 
              }
              .space-y-1 > * + * { 
                margin-top: 0.25rem !important; 
              }
              .space-y-2 > * + * { 
                margin-top: 0.5rem !important; 
              }
              .ml-2 { 
                margin-left: 0.5rem !important; 
              }
              .mr-2 { 
                margin-right: 0.5rem !important; 
              }
              .mx-auto { 
                margin-left: auto !important; 
                margin-right: auto !important; 
              }
              .w-full {
                width: 100% !important;
              }
              .w-auto {
                width: auto !important;
              }
              .min-w-0 {
                min-width: 0 !important;
              }
              .max-w-full {
                max-width: 100% !important;
              }
              .text-\[0\.65rem\] { 
                font-size: 0.65rem !important; 
              }
              .text-\[0\.7rem\] { 
                font-size: 0.7rem !important; 
              }
              .text-\[0\.8rem\] { 
                font-size: 0.8rem !important; 
              }
              .text-sm { 
                font-size: 0.875rem !important; 
              }
              .text-xs { 
                font-size: 0.75rem !important; 
              }
              .w-\[57mm\] { 
                width: 57mm !important; 
                max-width: 57mm !important;
                min-width: 57mm !important;
              }
              .max-h-\[66vh\] { 
                max-height: none !important; 
              }
              .overflow-y-auto { 
                overflow: visible !important; 
              }
              .overflow-hidden {
                overflow: hidden !important;
              }
              .overflow-ellipsis {
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
              }
              .bg-white { 
                background: white !important; 
              }
              .text-gray_b { 
                color: #4b5563 !important; 
              }
              .text-gray-600 { 
                color: #6b7280 !important; 
              }
              .text-red_b { 
                color: #dc2626 !important; 
              }
              .text-gray_m { 
                color: #6b7280 !important; 
              }
              .text-green-600 {
                color: #059669 !important;
              }
              .discount { 
                color: #666 !important; 
                font-size: 0.6rem !important; 
              }
              .uppercase { 
                text-transform: uppercase !important; 
              }
              .break-words {
                word-wrap: break-word !important;
                word-break: break-word !important;
              }
              .truncate {
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
              }
              
              /* Asegurar que los elementos flex se comporten igual */
              .flex > * {
                flex-shrink: 1 !important;
                min-width: 0 !important;
              }
              
              /* Forzar visibilidad */
              [class*="flex"] {
                display: flex !important;
              }
              
              /* Prevenir saltos de página dentro de elementos importantes */
              .break-inside-avoid {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              
              /* Mejoras específicas para items del ticket */
              .ticket-item {
                display: flex !important;
                justify-content: space-between !important;
                align-items: flex-start !important;
                width: 100% !important;
                margin-bottom: 0.25rem !important;
                break-inside: avoid !important;
              }
              
              .ticket-item-content {
                flex: 1 !important;
                min-width: 0 !important;
                margin-right: 0.5rem !important;
              }
              
              .ticket-item-price {
                flex-shrink: 0 !important;
                text-align: right !important;
                min-width: fit-content !important;
              }
              
              /* Responsive para pantallas pequeñas */
              @media (max-width: 80mm) {
                body {
                  font-size: 11px !important;
                  padding: 4px 6px !important;
                }
                
                .text-\[0\.7rem\] {
                  font-size: 0.65rem !important;
                }
                
                .text-sm {
                  font-size: 0.8rem !important;
                }
              }
            </style>
          </head>
          <body>
            ${exactHTML || ticketRef.current?.innerHTML || ""}
          </body>
        </html>
      `);

      printWindow.document.close();

      // Esperar a que todo cargue correctamente antes de imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();

          // Cerrar la ventana después de imprimir
          setTimeout(() => {
            printWindow.close();
            if (onPrint) {
              onPrint();
            }
          }, 500);
        }, 250);
      };
    };

    useImperativeHandle(ref, () => ({
      print: printTicket,
    }));

    useEffect(() => {
      if (autoPrint) {
        const timer = setTimeout(() => {
          printTicket().catch(console.error);
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [autoPrint]);

    return (
      <div className="max-h-[66vh] overflow-y-auto no-print">
        <div
          ref={ticketRef}
          className="p-2 pb-4 w-[57mm] mx-auto font-mono text-[0.7rem] bg-white text-black break-inside-avoid"
          style={{
            fontFamily: "'Courier New', monospace",
            lineHeight: 1.2,
            maxWidth: "57mm",
            minWidth: "57mm",
          }}
        >
          {/* Encabezado del negocio */}
          <div className="mb-3 text-center break-inside-avoid">
            <h2 className="font-bold text-sm mb-1 truncate">
              {businessData?.name || "Universal App"}
            </h2>
            <div className="text-[0.65rem] space-y-1">
              <p className="break-words">
                {businessData?.address || "Calle Falsa 123"}
              </p>
              <p>Tel: {businessData?.phone || "123-456789"}</p>
              <p>CUIT: {businessData?.cuit || "12-34567890-1"}</p>
            </div>
          </div>

          {/* Información del ticket */}
          <div className="border-b border-black py-1 mb-2 break-inside-avoid">
            <p className="font-bold text-left truncate">
              TICKET #{calculatedInvoiceNumber}
            </p>
            <p className="text-left text-[0.65rem]">{fecha}</p>

            {/* Información del cliente */}
            {shouldShowCustomerInfo() && (
              <div className="pt-1 mt-1 border-t border-gray-200 break-inside-avoid">
                <p className="font-semibold text-center text-[0.7rem] truncate">
                  Cliente: {sale.customerName}
                </p>
                {sale.customerPhone && (
                  <p className="text-[0.65rem] text-center">
                    Tel: {sale.customerPhone}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Items del ticket */}
          <div className="mb-2 space-y-1 break-inside-avoid">
            {invoiceItems.map((item, index) => (
              <div
                key={index}
                className="ticket-item border-b border-gray-200 py-1 break-inside-avoid"
              >
                <div className="ticket-item-content">
                  <span className="font-semibold text-[0.7rem] break-words">
                    {item.description}
                  </span>
                  <div className="text-[0.6rem] text-gray_b flex flex-wrap justify-between">
                    <span>
                      {item.quantity} {item.unit} x {formatCurrency(item.price)}
                    </span>
                    {item.discount && item.discount > 0 && (
                      <span className="text-red_b ml-2">-{item.discount}%</span>
                    )}
                  </div>
                </div>
                <div className="ticket-item-price">
                  <div className="font-semibold text-[0.7rem]">
                    {formatCurrency(item.subtotal)}
                  </div>
                  {item.discount && item.discount > 0 && (
                    <div className="text-[0.6rem] text-gray_m line-through">
                      {formatCurrency(item.subtotalSinDescuento)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Monto manual si existe */}
          {sale.manualAmount !== undefined && sale.manualAmount > 0 && (
            <div className="mt-2 pt-2 border-t border-gray_m break-inside-avoid">
              <div className="flex justify-between items-center">
                <span className="uppercase font-semibold text-[0.7rem]">
                  Monto Manual:
                </span>
                <span className="font-bold text-[0.8rem]">
                  {formatCurrency(sale.manualAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Formas de pago */}
          {sale.paymentMethods?.length > 0 && !sale.credit && (
            <div className="my-2 py-2 border-t border-gray_m break-inside-avoid">
              <span className="text-center font-semibold text-[0.7rem] block mb-1">
                Formas de pago
              </span>
              <div className="space-y-1">
                {sale.paymentMethods.map((method, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-[0.65rem]"
                  >
                    <span className="truncate mr-2">{method.method}:</span>
                    <span className="font-semibold">
                      {formatCurrency(method.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-black pt-2 mt-3 break-inside-avoid">
            <div className="flex justify-between font-bold text-sm items-center">
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Cuenta corriente */}
          {sale.credit && (
            <div className="text-center font-bold text-red_b my-2 py-2 border-t border-black break-inside-avoid">
              <div className="text-[0.8rem]">** CUENTA CORRIENTE **</div>
              {sale.customerName && (
                <p className="mt-1 text-[0.7rem] truncate">
                  Cliente: {sale.customerName}
                </p>
              )}
            </div>
          )}

          {/* Pie del ticket */}
          <div className="text-center mt-3 pt-2 border-t border-black text-[0.65rem] break-inside-avoid">
            <p className="font-semibold">¡Gracias por su compra!</p>
            <p className="mt-1">Conserve este ticket</p>
            <p className="mt-1 text-gray_m">---</p>
            <p className="mt-1 text-gray_m">Ticket no válido como factura</p>
          </div>
        </div>
      </div>
    );
  }
);

PrintableTicket.displayName = "PrintableTicket";

export default PrintableTicket;
