// AUTO-GENERATED — do not edit manually.
// Source: src/config/erp_systems.yaml in COA_Mapping_backend_V0
// Regenerate: python scripts/generate-erp-catalogue.py

export interface CatalogueConnectionMethod {
  readonly id: string;
  readonly name: string;
  readonly requires_mcp_config: boolean;
}

export interface CatalogueProduct {
  readonly id: string;
  readonly product_name: string;
  readonly connection_methods: readonly CatalogueConnectionMethod[];
}

export interface CatalogueVendor {
  readonly vendor: string;
  readonly products: readonly CatalogueProduct[];
}

export const ERP_CATALOGUE: readonly CatalogueVendor[] =
  [
    {
      "vendor": "ACS (Pty) Ltd",
      "products": [
        {
          "id": "acs_accpac",
          "product_name": "ACCPAC (Sage 300 Africa)",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Acumatica",
      "products": [
        {
          "id": "acumatica_cloud_erp",
          "product_name": "Acumatica Cloud ERP",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Anaplan (SAP)",
      "products": [
        {
          "id": "anaplan",
          "product_name": "Anaplan",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Aptean",
      "products": [
        {
          "id": "aptean_erp",
          "product_name": "Aptean ERP",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Certinia",
      "products": [
        {
          "id": "certinia_erp",
          "product_name": "Certinia ERP Cloud (Salesforce)",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Dassault Systèmes",
      "products": [
        {
          "id": "dassault_3dx",
          "product_name": "Dassault 3DEXPERIENCE Finance",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Deltek",
      "products": [
        {
          "id": "deltek_costpoint",
          "product_name": "Deltek Costpoint",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "deltek_vision",
          "product_name": "Deltek Vision",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "ECOUNT Co. Ltd.",
      "products": [
        {
          "id": "ecount_erp",
          "product_name": "ECOUNT ERP",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Epicor",
      "products": [
        {
          "id": "epicor_erp",
          "product_name": "Epicor ERP",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "epicor_kinetic",
          "product_name": "Epicor Kinetic",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Frappe Technologies",
      "products": [
        {
          "id": "erpnext",
          "product_name": "ERPNext",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "FreshBooks",
      "products": [
        {
          "id": "freshbooks",
          "product_name": "FreshBooks",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Genius Solutions",
      "products": [
        {
          "id": "genius_erp",
          "product_name": "Genius ERP",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "HashMicro",
      "products": [
        {
          "id": "hashmicro_erp",
          "product_name": "HashMicro ERP",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "IBM",
      "products": [
        {
          "id": "ibm_maximo",
          "product_name": "IBM Maximo Application Suite",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "ibm_cognos_controller",
          "product_name": "IBM Cognos Controller",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "IFS",
      "products": [
        {
          "id": "ifs_cloud",
          "product_name": "IFS Cloud",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Infor",
      "products": [
        {
          "id": "infor_cloudsuite",
          "product_name": "Infor CloudSuite Financials",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "infor_m3",
          "product_name": "Infor M3",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "infor_ln",
          "product_name": "Infor LN",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Intuit",
      "products": [
        {
          "id": "quickbooks",
          "product_name": "QuickBooks Online",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "quickbooks_desktop",
          "product_name": "QuickBooks Desktop",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "quickbooks_enterprise",
          "product_name": "QuickBooks Enterprise",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Kerridge Commercial Systems",
      "products": [
        {
          "id": "kerridge_k8",
          "product_name": "Kerridge K8",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Microsoft",
      "products": [
        {
          "id": "microsoft_dynamics",
          "product_name": "Microsoft Dynamics 365 Finance",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "mcp_server",
              "name": "MCP Server (Model Context Protocol)",
              "requires_mcp_config": true
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "microsoft_business_central",
          "product_name": "Microsoft Dynamics 365 Business Central",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "microsoft_gp",
          "product_name": "Microsoft Dynamics GP",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Odoo",
      "products": [
        {
          "id": "odoo",
          "product_name": "Odoo Community",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "mcp_server",
              "name": "MCP Server (Model Context Protocol)",
              "requires_mcp_config": true
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "odoo_enterprise",
          "product_name": "Odoo Enterprise",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "OpenPro",
      "products": [
        {
          "id": "openpro_erp",
          "product_name": "OpenPro ERP",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Oracle",
      "products": [
        {
          "id": "oracle_netsuite",
          "product_name": "Oracle NetSuite",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "mcp_server",
              "name": "MCP Server (Model Context Protocol)",
              "requires_mcp_config": true
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "oracle_jde",
          "product_name": "Oracle JD Edwards EnterpriseOne",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "oracle_ebs",
          "product_name": "Oracle E-Business Suite",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "oracle_fusion",
          "product_name": "Oracle Fusion Cloud ERP",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "QAD",
      "products": [
        {
          "id": "qad_erp",
          "product_name": "QAD ERP",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Ramco Systems",
      "products": [
        {
          "id": "ramco_erp",
          "product_name": "Ramco ERP",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Rockwell Automation",
      "products": [
        {
          "id": "plex_manufacturing",
          "product_name": "Plex Manufacturing Cloud",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Rootstock (Salesforce)",
      "products": [
        {
          "id": "rootstock_erp",
          "product_name": "Rootstock Cloud ERP (Salesforce)",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Sage",
      "products": [
        {
          "id": "sage",
          "product_name": "Sage Intacct",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "mcp_server",
              "name": "MCP Server (Model Context Protocol)",
              "requires_mcp_config": true
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "sage_300",
          "product_name": "Sage 300cloud",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "sage_50",
          "product_name": "Sage 50cloud",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "sage_x3",
          "product_name": "Sage X3",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "sage_200",
          "product_name": "Sage 200",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "pastel",
          "product_name": "Sage Pastel (Sage 50 Africa)",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "SAP",
      "products": [
        {
          "id": "sap",
          "product_name": "SAP S/4HANA",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "mcp_server",
              "name": "MCP Server (Model Context Protocol)",
              "requires_mcp_config": true
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "sap_business_one",
          "product_name": "SAP Business One",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "sap_byd",
          "product_name": "SAP Business ByDesign",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "sap_ecc",
          "product_name": "SAP ECC (ERP Central Component)",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "SYSPRO",
      "products": [
        {
          "id": "syspro_erp",
          "product_name": "SYSPRO ERP",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Tally Solutions",
      "products": [
        {
          "id": "tallyprime",
          "product_name": "TallyPrime",
          "connection_methods": [
            {
              "id": "on_premise",
              "name": "On-Premise (Self-Hosted)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Unit4",
      "products": [
        {
          "id": "unit4_erp",
          "product_name": "Unit4 ERP",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        },
        {
          "id": "unit4_financials",
          "product_name": "Unit4 Financials",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Wave (H&R Block)",
      "products": [
        {
          "id": "wave_accounting",
          "product_name": "Wave Accounting",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Workday",
      "products": [
        {
          "id": "workday_financial",
          "product_name": "Workday Financial Management",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Xero",
      "products": [
        {
          "id": "xero",
          "product_name": "Xero",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "mcp_server",
              "name": "MCP Server (Model Context Protocol)",
              "requires_mcp_config": true
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    },
    {
      "vendor": "Zoho Corporation",
      "products": [
        {
          "id": "zoho",
          "product_name": "Zoho Books",
          "connection_methods": [
            {
              "id": "cloud_saas",
              "name": "Cloud (SaaS)",
              "requires_mcp_config": false
            },
            {
              "id": "csv_file",
              "name": "CSV File (upload)",
              "requires_mcp_config": false
            }
          ]
        }
      ]
    }
  ] as const;
