import { DataTypes } from 'sequelize';
import sequelize from '../utils/database';
import CRMContact from './crmContact';
import encrypted from 'sequelize-encrypted';

const encryptionKey = process.env.ENCRYPTION_KEY || 'default_secret_key';
const encFields = encrypted(sequelize, encryptionKey);

const InteractionNote = sequelize.define('InteractionNote', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  crmContactId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CRMContact,
      key: 'id',
    },
  },
  encrypted: encFields.vault('encrypted'),
  content: encFields.field('content'),
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
});

export default InteractionNote; 