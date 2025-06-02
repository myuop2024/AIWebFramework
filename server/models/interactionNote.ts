import { DataTypes } from 'sequelize';
import sequelize from '../utils/database';
import CRMContact from './crmContact';

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
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
});

export default InteractionNote; 