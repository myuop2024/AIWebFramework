-- Create id_card_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS "id_card_templates" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "template_data" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT FALSE,
  "security_features" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a default template
INSERT INTO "id_card_templates" (
  "name", 
  "description", 
  "template_data", 
  "is_active", 
  "security_features"
) VALUES (
  'CAFFE Professional Observer ID Card',
  'Advanced observer ID card template with premium design and security features',
  '{
    "dimensions": {
      "width": 1024,
      "height": 648
    },
    "background": "#ffffff",
    "elements": [
      {
        "type": "text",
        "x": 512,
        "y": 100,
        "value": "ELECTION OBSERVER",
        "style": {
          "font": "bold 36px Roboto",
          "textAlign": "center",
          "fillStyle": "#062A57"
        }
      },
      {
        "type": "text",
        "x": 512,
        "y": 150,
        "fieldName": "fullName",
        "style": {
          "font": "bold 28px Roboto",
          "textAlign": "center",
          "fillStyle": "#000000"
        }
      },
      {
        "type": "text",
        "x": 250,
        "y": 230,
        "value": "Observer ID:",
        "style": {
          "font": "bold 24px Roboto",
          "textAlign": "right",
          "fillStyle": "#062A57"
        }
      },
      {
        "type": "text",
        "x": 260,
        "y": 230,
        "fieldName": "observerId",
        "style": {
          "font": "24px Roboto",
          "textAlign": "left",
          "fillStyle": "#000000"
        }
      },
      {
        "type": "text",
        "x": 250,
        "y": 280,
        "value": "Valid Until:",
        "style": {
          "font": "bold 24px Roboto",
          "textAlign": "right",
          "fillStyle": "#062A57"
        }
      },
      {
        "type": "text",
        "x": 260,
        "y": 280,
        "value": "December 31, 2025",
        "style": {
          "font": "24px Roboto",
          "textAlign": "left",
          "fillStyle": "#000000"
        }
      },
      {
        "type": "text",
        "x": 250,
        "y": 330,
        "value": "Role:",
        "style": {
          "font": "bold 24px Roboto",
          "textAlign": "right",
          "fillStyle": "#062A57"
        }
      },
      {
        "type": "text",
        "x": 260,
        "y": 330,
        "fieldName": "role",
        "style": {
          "font": "24px Roboto",
          "textAlign": "left",
          "fillStyle": "#000000"
        }
      },
      {
        "type": "text",
        "x": 512,
        "y": 420,
        "value": "OFFICIAL OBSERVER",
        "style": {
          "font": "bold 18px Roboto",
          "textAlign": "center",
          "fillStyle": "#ffffff",
          "backgroundColor": "#D9281F",
          "padding": 8,
          "borderRadius": 4
        }
      },
      {
        "type": "text",
        "x": 512,
        "y": 470,
        "value": "GENERAL ELECTION DECEMBER 2025",
        "style": {
          "font": "16px Roboto",
          "textAlign": "center",
          "fillStyle": "#ffffff",
          "backgroundColor": "rgba(6, 42, 87, 0.7)",
          "padding": 6,
          "borderRadius": 4
        }
      },
      {
        "type": "text",
        "x": 512,
        "y": 530,
        "value": "Citizens Action for Free and Fair Elections",
        "style": {
          "font": "italic 14px Roboto",
          "textAlign": "center",
          "fillStyle": "#333333"
        }
      },
      {
        "type": "qrcode",
        "x": 800,
        "y": 280,
        "width": 180,
        "height": 180,
        "fieldName": "qrData"
      }
    ]
  }',
  TRUE,
  '{
    "watermark": "CAFFE Observer",
    "qrEncryption": true,
    "otherFeatures": ["UV ink detection", "Holographic overlay"]
  }'
) ON CONFLICT DO NOTHING;