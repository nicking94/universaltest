"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
    const [paperSize, setPaperSize] = useState<"57mm" | "80mm">("80mm");
    const fecha = format(parseISO(sale.date), "dd/MM/yyyy HH:mm", {
      locale: es,
    });

    // Cargar la preferencia guardada al inicializar el componente
    useEffect(() => {
      const savedPaperSize = localStorage.getItem("ticketPaperSize") as
        | "57mm"
        | "80mm";
      if (
        savedPaperSize &&
        (savedPaperSize === "57mm" || savedPaperSize === "80mm")
      ) {
        setPaperSize(savedPaperSize);
      }
    }, []);

    // Guardar en localStorage cuando cambia el tamaño
    const handlePaperSizeChange = (size: "57mm" | "80mm") => {
      setPaperSize(size);
      localStorage.setItem("ticketPaperSize", size);
    };

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

    const getPrintStyles = () => {
      const width = paperSize === "80mm" ? "80mm" : "57mm";

      return `
      @page {
        size: ${width} auto;
        margin: 0;
        padding: 0;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace !important;
          font-size: ${paperSize === "80mm" ? "14px" : "12px"} !important;
          width: ${width} !important;
          margin: 0 !important;
          padding: 5px !important;
          line-height: 1 !important;
          background: white !important;
          color: black !important;
          overflow: visible !important;
          max-height: none !important;
        }
        .ticket-container {
          width: ${width} !important;
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
        
        /* Eliminar cualquier scroll o limitación de altura */
        .no-scroll {
          max-height: none !important;
          overflow: visible !important;
          height: auto !important;
        }

        /* Estilos específicos para elementos del ticket */
        .ticket-line { margin: 0 !important; padding: 0 !important; line-height: 1 !important; }
        .ticket-section { margin: 2px 0 !important; padding: 0 !important; }
        .ticket-item { margin: 1px 0 !important; padding: 0 !important; }
        .compact-text { line-height: 1 !important; margin: 0 !important; padding: 0 !important; }
      }
    `;
    };

    const printWithBrowserDialog = () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const ticketContent =
        ticketRef.current?.querySelector(".ticket-content")?.innerHTML || "";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket ${calculatedInvoiceNumber}</title>
            <meta charset="utf-8">
            <style>
              ${getPrintStyles()}
              
              /* Estilos base para TODOS los modos (pantalla e impresión) */
              body {
                font-family: 'Courier New', monospace;
                font-size: ${paperSize === "80mm" ? "14px" : "12px"};
                width: ${paperSize === "80mm" ? "80mm" : "57mm"};
                margin: 0 auto;
                padding: 5px;
                line-height: 1;
                background: white;
                color: black;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .ticket-container {
                width: ${paperSize === "80mm" ? "80mm" : "57mm"};
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
              
              /* ESTILOS COMPACTOS APLICADOS A TODOS LOS ELEMENTOS */
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                line-height: 1 !important;
              }
              
              p, div, span {
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1 !important;
              }
              
              .border-bottom-dashed {
                border-bottom: 1px dashed #000 !important;
              }
              
              .border-top-dashed {
                border-top: 1px dashed #000 !important;
              }
              
              .ticket-line { 
                margin: 0 !important; 
                padding: 0 !important; 
                line-height: 1 !important; 
              }
              .ticket-section { 
                margin: 2px 0 !important; 
                padding: 0 !important; 
              }
              .ticket-item { 
                margin: 1px 0 !important; 
                padding: 0 !important; 
              }
              .compact-text { 
                line-height: 1 !important; 
                margin: 0 !important; 
                padding: 0 !important; 
              }
            </style>
          </head>
          <body>
            <div class="ticket-container no-scroll">
              ${ticketContent}
            </div>
            
            <script>
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    window.close();
                  }, 500);
                }, 500);
              };
              
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

    // Estilos CSS para el componente
    const styles = {
      container: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "12px",
      },
      paperSelector: {
        backgroundColor: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "8px",
        padding: "12px",
      },
      paperSelectorTitle: {
        textAlign: "center" as const,
        marginBottom: "8px",
      },
      paperSelectorText: {
        fontSize: "12px",
        color: "#2563eb",
      },
      paperOptions: {
        display: "flex",
        justifyContent: "center",
        gap: "24px",
      },
      paperOption: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        cursor: "pointer",
      },
      paperOptionBox: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        borderRadius: "8px",
        border: "2px solid",
        transition: "all 0.2s ease",
      },
      paperOptionText: {
        fontWeight: "500",
      },
      paperOptionLabel: {
        fontSize: "11px",
        color: "#6b7280",
        marginTop: "4px",
      },
      previewContainer: {
        maxHeight: "50vh",
        overflowY: "scroll" as const,
      },
      ticketContainer: {
        fontFamily: "'Courier New', monospace",
        lineHeight: 1,
        backgroundColor: "white",
        color: "#2c2c2c",
        margin: "0 auto",
        padding: "4px",
        paddingBottom: "4px",
        width: paperSize === "80mm" ? "80mm" : "57mm",
        fontSize: paperSize === "80mm" ? "12px" : "10px",
      },
      ticketContent: {
        lineHeight: 1,
      },
      businessHeader: {
        marginBottom: "4px",
        textAlign: "center" as const,
      },
      businessName: {
        textAlign: "center" as const,
        fontWeight: "bold",
        marginBottom: "0",
        fontSize: paperSize === "80mm" ? "14px" : "12px",
        lineHeight: 1,
      },
      businessInfo: {
        lineHeight: 1,
        margin: "0",
        padding: "0",
        fontSize: paperSize === "80mm" ? "11px" : "9px",
      },
      ticketInfo: {
        padding: "0",
        marginBottom: "4px",
      },
      separator: {
        margin: "0",
        padding: "0",
        lineHeight: 1,
      },
      ticketNumber: {
        fontWeight: "bold",
        padding: "0",
        margin: "0",
        lineHeight: 1,
      },
      ticketDate: {
        padding: "0",
        margin: "0",
        lineHeight: 1,
      },
      customerInfo: {
        padding: "0",
      },
      customerText: {
        fontWeight: "600",
        padding: "0",
        margin: "0",
        lineHeight: 1,
      },
      itemsContainer: {
        marginBottom: "4px",
      },
      item: {
        padding: "0",
        margin: "1px 0",
      },
      itemRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      },
      itemDescription: {
        flex: 1,
      },
      itemName: {
        fontWeight: "600",
        lineHeight: 1,
      },
      itemDetails: {
        lineHeight: 1,
        color: "#6b7280",
        fontSize: paperSize === "80mm" ? "10px" : "8px",
      },
      itemPrice: {
        fontSize: paperSize === "80mm" ? "9px" : "7px",
      },
      itemTotal: {
        textAlign: "right" as const,
        marginLeft: "4px",
      },
      itemAmount: {
        fontWeight: "600",
        lineHeight: 1,
      },
      discountText: {
        lineHeight: 1,
        color: "#6b7280",
        fontSize: paperSize === "80mm" ? "9px" : "7px",
      },
      manualAmount: {
        marginTop: "4px",
        paddingTop: "0",
      },
      manualAmountRow: {
        display: "flex",
        justifyContent: "space-between",
        lineHeight: 1,
      },
      manualAmountText: {
        textTransform: "uppercase" as const,
        fontWeight: "600",
      },
      paymentMethods: {
        marginBottom: "4px",
        marginTop: "4px",
        paddingTop: "0",
      },
      paymentTitle: {
        textAlign: "center" as const,
        fontWeight: "600",
        display: "block",
        lineHeight: 1,
      },
      paymentRow: {
        display: "flex",
        justifyContent: "space-between",
        padding: "0",
        lineHeight: 1,
        fontSize: paperSize === "80mm" ? "10px" : "8px",
      },
      totalSection: {
        paddingTop: "0",
        marginTop: "4px",
      },
      totalRow: {
        display: "flex",
        justifyContent: "space-between",
        fontWeight: "bold",
        lineHeight: 1,
      },
      creditSection: {
        textAlign: "center" as const,
        fontWeight: "bold",
        color: "#dc2626",
        marginBottom: "0",
        paddingTop: "0",
        marginTop: "4px",
      },
      footer: {
        textAlign: "center" as const,
        marginTop: "4px",
        paddingTop: "0",
        fontSize: paperSize === "80mm" ? "10px" : "8px",
      },
      footerText: {
        margin: "0",
        padding: "0",
        lineHeight: 1,
      },
      smallText: {
        fontSize: "6px",
        margin: "0",
        padding: "0",
        lineHeight: 1,
      },
    };

    return (
      <div style={styles.container}>
        {/* Selector de tamaño de papel */}
        <div style={styles.paperSelector}>
          <div style={styles.paperSelectorTitle}>
            <p style={styles.paperSelectorText}>
              Selecciona el tamaño del rollo de ticket
            </p>
          </div>

          <div style={styles.paperOptions}>
            <label style={styles.paperOption}>
              <div
                style={{
                  ...styles.paperOptionBox,
                  borderColor: paperSize === "57mm" ? "#268ed4" : "#d1d5db",
                  backgroundColor: paperSize === "57mm" ? "#eaf6ff" : "white",
                }}
              >
                <input
                  type="radio"
                  name="paperSize"
                  value="57mm"
                  checked={paperSize === "57mm"}
                  onChange={(e) =>
                    handlePaperSizeChange(e.target.value as "57mm" | "80mm")
                  }
                  style={{
                    color: "#268ed4",
                  }}
                />
                <span
                  style={{
                    ...styles.paperOptionText,
                    color: paperSize === "57mm" ? "#2d78b9" : "#2c2c2c",
                  }}
                >
                  57mm
                </span>
              </div>
              <span style={styles.paperOptionLabel}>Estándar</span>
            </label>

            <label style={styles.paperOption}>
              <div
                style={{
                  ...styles.paperOptionBox,
                  borderColor: paperSize === "80mm" ? "#3b82f6" : "#d1d5db",
                  backgroundColor: paperSize === "80mm" ? "#eff6ff" : "white",
                }}
              >
                <input
                  type="radio"
                  name="paperSize"
                  value="80mm"
                  checked={paperSize === "80mm"}
                  onChange={(e) =>
                    handlePaperSizeChange(e.target.value as "57mm" | "80mm")
                  }
                  style={{
                    color: "#3b82f6",
                  }}
                />
                <span
                  style={{
                    ...styles.paperOptionText,
                    color: paperSize === "80mm" ? "#1d4ed8" : "#374151",
                  }}
                >
                  80mm
                </span>
              </div>
              <span style={styles.paperOptionLabel}>Ancho</span>
            </label>
          </div>
        </div>

        {/* Contenedor para preview (solo en pantalla) */}
        <div style={styles.previewContainer}>
          {/* Contenedor principal del ticket */}
          <div ref={ticketRef} style={styles.ticketContainer}>
            {/* Contenido del ticket - este es el que se imprime */}
            <div className="ticket-content" style={styles.ticketContent}>
              {/* Encabezado del negocio */}
              <div style={styles.businessHeader}>
                <h2 style={styles.businessName}>
                  {businessData?.name || "Universal App"}
                </h2>
                <p style={styles.businessInfo}>
                  {businessData?.address || "Calle Falsa 123"}
                </p>
                <p style={styles.businessInfo}>
                  Tel: {businessData?.phone || "123-456789"}
                </p>
                <p style={styles.businessInfo}>
                  CUIT: {businessData?.cuit || "12-34567890-1"}
                </p>
              </div>

              {/* Información del ticket */}
              <div style={styles.ticketInfo}>
                <p style={styles.separator}>
                  {paperSize === "80mm"
                    ? "---------------------------------------"
                    : "-----------------------------"}
                </p>
                <p style={styles.ticketNumber}>
                  TICKET #{calculatedInvoiceNumber}
                </p>
                <p style={styles.ticketDate}>{fecha}</p>
                {/* Información del cliente */}
                {shouldShowCustomerInfo() && (
                  <div style={styles.customerInfo}>
                    <p style={styles.customerText}>
                      Cliente: {sale.customerName}
                    </p>
                  </div>
                )}
                <p style={styles.separator}>
                  {paperSize === "80mm"
                    ? "---------------------------------------"
                    : "-----------------------------"}
                </p>
              </div>

              {/* Items del ticket */}
              <div style={styles.itemsContainer}>
                {invoiceItems.map((item, index) => (
                  <div key={index} style={styles.item}>
                    <div style={styles.itemRow}>
                      <div style={styles.itemDescription}>
                        <span style={styles.itemName}>{item.description}</span>
                        <div style={styles.itemDetails}>
                          x{item.quantity} {item.unit}{" "}
                          <span style={styles.itemPrice}>
                            ({formatCurrency(item.price)})
                          </span>
                        </div>
                      </div>
                      <div style={styles.itemTotal}>
                        <div style={styles.itemAmount}>
                          {formatCurrency(item.subtotal)}
                        </div>
                        {item.discount && item.discount > 0 && (
                          <div style={styles.discountText}>
                            desc. {item.discount}%
                          </div>
                        )}
                      </div>
                    </div>
                    <p style={styles.separator}>
                      {paperSize === "80mm"
                        ? "________________________________________"
                        : "_____________________________"}
                    </p>
                  </div>
                ))}
              </div>

              {sale.manualAmount !== undefined && sale.manualAmount > 0 && (
                <div style={styles.manualAmount}>
                  <div style={styles.manualAmountRow}>
                    <span style={styles.manualAmountText}>Monto Manual:</span>
                    <span>{formatCurrency(sale.manualAmount)}</span>
                  </div>
                  <p style={styles.separator}>
                    {paperSize === "80mm"
                      ? "---------------------------------------"
                      : "-----------------------------"}
                  </p>
                </div>
              )}

              {/* Formas de pago */}
              {sale.paymentMethods?.length > 0 && !sale.credit && (
                <div style={styles.paymentMethods}>
                  <span style={styles.paymentTitle}>Formas de pago</span>
                  {sale.paymentMethods.map((method, idx) => (
                    <div key={idx} style={styles.paymentRow}>
                      <span>{method.method}:</span>
                      <span>{formatCurrency(method.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div style={styles.totalSection}>
                <p style={styles.separator}>
                  {paperSize === "80mm"
                    ? "---------------------------------------"
                    : "-----------------------------"}
                </p>

                <div style={styles.totalRow}>
                  <span>TOTAL:</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>
                <p style={styles.separator}>
                  {paperSize === "80mm"
                    ? "---------------------------------------"
                    : "-----------------------------"}
                </p>
              </div>

              {/* Cuenta corriente */}
              {sale.credit && (
                <div style={styles.creditSection}>
                  <p style={styles.footerText}>** CUENTA CORRIENTE **</p>
                  {sale.customerName && (
                    <p style={styles.footerText}>
                      Cliente: {sale.customerName}
                    </p>
                  )}
                </div>
              )}

              {/* Pie del ticket */}
              <div style={styles.footer}>
                <p style={styles.footerText}>¡Gracias por su compra!</p>
                <p style={styles.smallText}>Ticket no válido como factura</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PrintableTicket.displayName = "PrintableTicket";

export default PrintableTicket;
