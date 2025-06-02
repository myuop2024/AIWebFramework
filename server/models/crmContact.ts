import { DataTypes } from 'sequelize';
import sequelize from '../utils/database';
import encrypted from 'sequelize-encrypted';

const encryptionKey = process.env.ENCRYPTION_KEY || 'default_secret_key';
const encFields = encrypted(sequelize, encryptionKey);

const CRMContact = sequelize.define('CRMContact', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  encrypted: encFields.vault('encrypted'),
  email: encFields.field('email'),
  phone: encFields.field('phone'),
  address: encFields.field('address'),
  notes: encFields.field('notes'),
  linkedUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default CRMContact; 