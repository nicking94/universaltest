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

    // Configuraciones estándar para cada tamaño de ticket
    const getTicketConfig = () => {
      if (paperSize === "57mm") {
        return {
          width: "57mm",
          fontSize: {
            large: "14px", // Para nombre del negocio
            medium: "12px", // Para texto principal
            small: "10px", // Para detalles
            xsmall: "8px", // Para texto muy pequeño
          },
          padding: "5px",
          maxCharsPerLine: 32, // Caracteres máx por línea en 57mm
        };
      } else {
        return {
          width: "80mm",
          fontSize: {
            large: "16px", // Para nombre del negocio
            medium: "14px", // Para texto principal
            small: "12px", // Para detalles
            xsmall: "10px", // Para texto muy pequeño
          },
          padding: "6px",
          maxCharsPerLine: 48, // Caracteres máx por línea en 80mm
        };
      }
    };

    const ticketConfig = getTicketConfig();

    const getPrintStyles = () => {
      return `
      @page {
        size: ${ticketConfig.width} auto;
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
          font-size: ${ticketConfig.fontSize.medium} !important;
          width: ${ticketConfig.width} !important;
          margin: 0 !important;
          padding: ${ticketConfig.padding} !important;
          line-height: 1.2 !important;
          background: white !important;
          color: black !important;
          overflow: visible !important;
          max-height: none !important;
        }
        .ticket-container {
          width: ${ticketConfig.width} !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: white !important;
          overflow: visible !important;
          max-height: none !important;
        }
        
        /* ESTILOS ESPECÍFICOS PARA MEJORAR LEGIBILIDAD */
        .business-info, .footer-text, .payment-methods {
          font-size: ${ticketConfig.fontSize.medium} !important;
          font-weight: bold !important;
          line-height: 1.3 !important;
        }
        
        .small-text {
          font-size: ${ticketConfig.fontSize.xsmall} !important;
          font-weight: normal !important;
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
        .ticket-line { margin: 0 !important; padding: 0 !important; line-height: 1.2 !important; }
        .ticket-section { margin: 4px 0 !important; padding: 0 !important; }
        .ticket-item { margin: 3px 0 !important; padding: 0 !important; }
        .compact-text { line-height: 1.2 !important; margin: 0 !important; padding: 0 !important; }
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
                font-size: ${ticketConfig.fontSize.medium};
                width: ${ticketConfig.width};
                margin: 0 auto;
                padding: ${ticketConfig.padding};
                line-height: 1.2;
                background: white;
                color: black;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .ticket-container {
                width: ${ticketConfig.width};
                margin: 0 auto;
                background: white;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              
              /* CLASES ESPECÍFICAS PARA MEJORAR LEGIBILIDAD EN IMPRESIÓN */
              .business-info, .footer-text, .payment-methods {
                font-size: ${ticketConfig.fontSize.medium} !important;
                font-weight: bold !important;
                line-height: 1.3 !important;
              }
              
              .small-text {
                font-size: ${ticketConfig.fontSize.xsmall} !important;
                font-weight: normal !important;
                line-height: 1.2 !important;
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
                line-height: 1.2 !important;
              }
              
              p, div, span {
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.2 !important;
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
                line-height: 1.2 !important; 
              }
              .ticket-section { 
                margin: 4px 0 !important; 
                padding: 0 !important; 
              }
              .ticket-item { 
                margin: 3px 0 !important; 
                padding: 0 !important; 
              }
              .compact-text { 
                line-height: 1.2 !important; 
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

    // Estilos CSS para el componente usando configuraciones estándar
    const styles = {
      container: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "12px",
        fontWeight: "bold" as const,
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
        fontSize: "15px",
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
        fontSize: "14px",
        color: "#6b7280",
        marginTop: "4px",
      },
      previewContainer: {
        maxHeight: "50vh",
        overflowY: "scroll" as const,
      },
      ticketContainer: {
        fontFamily: "'Courier New', monospace",
        lineHeight: 1.2,
        backgroundColor: "white",
        color: "#2c2c2c",
        margin: "0 auto",
        padding: ticketConfig.padding,
        paddingBottom: ticketConfig.padding,
        width: ticketConfig.width,
        fontSize: ticketConfig.fontSize.medium,
      },
      ticketContent: {
        lineHeight: 1.2,
      },
      businessHeader: {
        marginBottom: "8px",
        textAlign: "center" as const,
      },
      businessName: {
        textAlign: "center" as const,
        fontWeight: "bold",
        marginBottom: "4px",
        fontSize: ticketConfig.fontSize.large,
        lineHeight: 1.3,
      },
      businessInfo: {
        lineHeight: 1.3,
        margin: "3px 0",
        padding: "0",
        fontSize: ticketConfig.fontSize.medium,
        fontWeight: "bold" as const,
      },
      ticketInfo: {
        padding: "0",
        marginBottom: "8px",
      },
      separator: {
        margin: "6px 0",
        padding: "0",
        lineHeight: 1,
        borderBottom: "1px solid #000",
        height: "1px",
      },
      doubleSeparator: {
        margin: "6px 0",
        padding: "0",
        lineHeight: 1,
        borderBottom: "2px solid #000",
        height: "2px",
      },
      dashedSeparator: {
        margin: "5px 0",
        padding: "0",
        lineHeight: 1,
        borderBottom: "1px dashed #000",
        height: "1px",
      },
      ticketNumber: {
        fontWeight: "bold",
        padding: "0",
        margin: "4px 0",
        lineHeight: 1.2,
        fontSize: ticketConfig.fontSize.medium,
      },
      ticketDate: {
        padding: "0",
        margin: "4px 0",
        lineHeight: 1.2,
        fontSize: ticketConfig.fontSize.medium,
      },
      customerInfo: {
        padding: "0",
        margin: "6px 0",
      },
      customerText: {
        fontWeight: "600",
        padding: "0",
        margin: "3px 0",
        lineHeight: 1.2,
        fontSize: ticketConfig.fontSize.medium,
      },
      itemsContainer: {
        marginBottom: "8px",
      },
      item: {
        padding: "0",
        margin: "6px 0",
      },
      itemRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "6px",
      },
      itemDescription: {
        flex: 1,
        minWidth: 0, // Para prevenir overflow
      },
      itemName: {
        fontWeight: "600",
        lineHeight: 1.3,
        fontSize: ticketConfig.fontSize.medium,
        wordWrap: "break-word" as const,
        marginBottom: "2px",
      },
      itemDetails: {
        lineHeight: 1.2,
        color: "#6b7280",
        fontSize: ticketConfig.fontSize.small,
        fontWeight: "bold" as const,
      },
      itemPrice: {
        fontSize: ticketConfig.fontSize.small,
        fontWeight: "bold" as const,
      },
      itemTotal: {
        textAlign: "right" as const,
        minWidth: "fit-content",
        fontWeight: "bold" as const,
      },
      itemAmount: {
        fontWeight: "bold" as const,
        lineHeight: 1.2,
        fontSize: ticketConfig.fontSize.medium,
        marginBottom: "2px",
      },
      discountText: {
        lineHeight: 1.2,
        color: "#6b7280",
        fontSize: ticketConfig.fontSize.small,
        fontWeight: "bold" as const,
      },
      manualAmount: {
        marginTop: "8px",
        paddingTop: "0",
        fontWeight: "bold" as const,
      },
      manualAmountRow: {
        display: "flex",
        justifyContent: "space-between",
        lineHeight: 1.2,
        fontWeight: "bold" as const,
        fontSize: ticketConfig.fontSize.medium,
        margin: "4px 0",
      },
      manualAmountText: {
        textTransform: "uppercase" as const,
        fontWeight: "600",
      },
      paymentMethods: {
        marginBottom: "8px",
        marginTop: "8px",
        paddingTop: "0",
      },
      paymentTitle: {
        textAlign: "center" as const,
        fontWeight: "600",
        display: "block",
        lineHeight: 1.3,
        fontSize: ticketConfig.fontSize.medium,
        margin: "6px 0",
      },
      paymentRow: {
        display: "flex",
        justifyContent: "space-between",
        padding: "0",
        lineHeight: 1.3,
        fontSize: ticketConfig.fontSize.medium,
        fontWeight: "bold" as const,
        margin: "4px 0",
      },
      totalSection: {
        paddingTop: "0",
        marginTop: "8px",
      },
      totalRow: {
        display: "flex",
        justifyContent: "space-between",
        fontWeight: "bold",
        lineHeight: 1.3,
        fontSize: ticketConfig.fontSize.medium,
        margin: "6px 0",
      },
      creditSection: {
        textAlign: "center" as const,
        fontWeight: "bold",
        color: "#dc2626",
        marginBottom: "0",
        paddingTop: "0",
        marginTop: "8px",
      },
      footer: {
        textAlign: "center" as const,
        marginTop: "8px",
        paddingTop: "0",
        fontSize: ticketConfig.fontSize.medium,
      },
      footerText: {
        margin: "6px 0",
        padding: "0",
        lineHeight: 1.3,
        fontWeight: "bold" as const,
      },
      smallText: {
        fontSize: ticketConfig.fontSize.xsmall,
        margin: "4px 0",
        padding: "0",
        lineHeight: 1.2,
        fontWeight: "normal" as const,
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
                <p className="business-info" style={styles.businessInfo}>
                  {businessData?.address || "Calle Falsa 123"}
                </p>
                <p className="business-info" style={styles.businessInfo}>
                  Tel: {businessData?.phone || "123-456789"}
                </p>
                <p className="business-info" style={styles.businessInfo}>
                  CUIT: {businessData?.cuit || "12-34567890-1"}
                </p>
              </div>

              {/* Información del ticket */}
              <div style={styles.ticketInfo}>
                <div style={styles.separator}></div>
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
                <div style={styles.separator}></div>
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
                    <div style={styles.dashedSeparator}></div>
                  </div>
                ))}
              </div>

              {sale.manualAmount !== undefined && sale.manualAmount > 0 && (
                <div style={styles.manualAmount}>
                  <div style={styles.manualAmountRow}>
                    <span style={styles.manualAmountText}>Monto Manual:</span>
                    <span>{formatCurrency(sale.manualAmount)}</span>
                  </div>
                  <div style={styles.separator}></div>
                </div>
              )}

              {/* Formas de pago */}
              {sale.paymentMethods?.length > 0 && !sale.credit && (
                <div className="payment-methods" style={styles.paymentMethods}>
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
                <div style={styles.separator}></div>

                <div style={styles.totalRow}>
                  <span>TOTAL:</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>
                <div style={styles.doubleSeparator}></div>
              </div>

              {/* Cuenta corriente */}
              {sale.credit && (
                <div style={styles.creditSection}>
                  <p className="footer-text" style={styles.footerText}>
                    ** CUENTA CORRIENTE **
                  </p>
                  {sale.customerName && (
                    <p className="footer-text" style={styles.footerText}>
                      Cliente: {sale.customerName}
                    </p>
                  )}
                </div>
              )}

              {/* Pie del ticket */}
              <div className="footer-text" style={styles.footer}>
                <p className="footer-text" style={styles.footerText}>
                  ¡Gracias por su compra!
                </p>
                <p className="small-text" style={styles.smallText}>
                  Ticket no válido como factura
                </p>
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
