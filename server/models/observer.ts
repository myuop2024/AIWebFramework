import { DataTypes } from 'sequelize';
import sequelize from '../utils/database';
import CRMContact from './crmContact';

const Observer = sequelize.define('Observer', {
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
  parish: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default Observer; 