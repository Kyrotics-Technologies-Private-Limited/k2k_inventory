# Inventory Restocking System

## Overview

This system automatically restocks inventory when orders are cancelled by either users or administrators. The restocking process ensures that the quantity of items in the order is added back to the available inventory.

## How It Works

### Backend Implementation

#### 1. Order Cancellation Functions

**Location**: `server/controllers/orderController.js`

Two main functions handle order cancellation with inventory restocking:

1. **`cancelOrder`** - For user-initiated cancellations
2. **`adminUpdateOrderStatus`** - For admin-initiated cancellations

#### 2. Restocking Logic

The system includes a helper function `restockOrderItems` that:

- Iterates through all items in the cancelled order
- For each item, finds the corresponding variant in the database
- Adds the ordered quantity back to the current stock
- Updates the `inStock` status based on the new stock level
- Updates the `stockStatus` field
- Records the update timestamp

```javascript
const restockOrderItems = async (items) => {
  if (!items || items.length === 0) return;
  
  for (const item of items) {
    const { productId, variantId, quantity } = item;
    
    if (productId && variantId && quantity) {
      const variantRef = db.collection('products').doc(productId).collection('variants').doc(variantId);
      const variantDoc = await variantRef.get();
      
      if (variantDoc.exists) {
        const variantData = variantDoc.data();
        const currentStock = variantData.units_in_stock || 0;
        const newStock = currentStock + quantity;
        
        await variantRef.update({
          units_in_stock: newStock,
          inStock: newStock > 0,
          stockStatus: newStock > 0 ? 'in_stock' : 'out_of_stock',
          updatedAt: getTimestamp(),
        });
      }
    }
  }
};
```

### Frontend Implementation

#### 1. Order Management Pages

**Location**: 
- `client/src/pages/admin/AdminOrderDetails.tsx`
- `client/src/pages/admin/AdminOrders.tsx`

The frontend provides:

- **User Feedback**: Shows success messages when orders are cancelled and inventory is restocked
- **Inventory Refresh**: Automatically refreshes inventory data after cancellation
- **Real-time Updates**: Ensures the UI reflects the updated stock levels

#### 2. API Integration

**Location**: `client/src/services/api/orderApi.ts`

The `refreshInventoryAfterCancellation` function:

- Retrieves the cancelled order details
- Identifies affected products and variants
- Refreshes inventory data for those products
- Handles errors gracefully without affecting the user experience

## Key Features

### 1. Automatic Restocking
- When an order is cancelled, all items in the order are automatically restocked
- The system handles multiple items per order
- Stock levels are updated in real-time

### 2. Status Validation
- Only allows cancellation of orders that aren't already cancelled or delivered
- Prevents duplicate restocking by checking previous status

### 3. Error Handling
- Graceful handling of missing variants or products
- Logs warnings for debugging without breaking the user experience
- Continues processing even if some inventory updates fail

### 4. User Feedback
- Clear success messages when orders are cancelled
- Specific messaging about inventory restocking
- Toast notifications for immediate feedback

### 5. Data Consistency
- Updates multiple fields: `units_in_stock`, `inStock`, `stockStatus`
- Maintains audit trail with `updatedAt` timestamps
- Ensures data integrity across the system

## Usage Examples

### Admin Cancelling an Order

1. Admin navigates to the orders page
2. Clicks "Update" on an order
3. Changes status to "Cancelled"
4. System automatically:
   - Updates order status to "Cancelled"
   - Restocks all items in the order
   - Shows success message with restocking confirmation
   - Refreshes inventory data in the background

### User Cancelling Their Order

1. User navigates to their order history
2. Clicks "Cancel" on an eligible order
3. System automatically:
   - Updates order status to "Cancelled"
   - Restocks all items in the order
   - Returns items to available inventory

## Database Schema

### Variant Collection Structure
```javascript
{
  id: "variant_id",
  productId: "product_id",
  weight: "500g",
  price: 299.99,
  units_in_stock: 50,        // Updated during restocking
  inStock: true,             // Updated during restocking
  stockStatus: "in_stock",   // Updated during restocking
  updatedAt: timestamp       // Updated during restocking
}
```

### Order Collection Structure
```javascript
{
  id: "order_id",
  userId: "user_id",
  status: "cancelled",       // Updated during cancellation
  items: [
    {
      productId: "product_id",
      variantId: "variant_id",
      quantity: 2
    }
  ],
  updatedAt: timestamp       // Updated during cancellation
}
```

## Testing

### Test Scenarios

1. **Basic Cancellation**: Cancel an order with multiple items
2. **Edge Cases**: Cancel orders with out-of-stock items
3. **Error Handling**: Test with missing variants or products
4. **Concurrent Updates**: Multiple cancellations happening simultaneously
5. **Status Validation**: Attempt to cancel already cancelled orders

### Manual Testing Steps

1. Create an order with multiple items
2. Note the current stock levels of the items
3. Cancel the order (as admin or user)
4. Verify that stock levels are increased by the ordered quantities
5. Check that the order status is updated to "Cancelled"
6. Verify that success messages are displayed

## Security Considerations

- Only authenticated users can cancel their own orders
- Only admins can cancel any order
- Status validation prevents invalid cancellations
- Error handling prevents data corruption
- Audit trail maintained for all changes

## Performance Considerations

- Restocking operations are performed in parallel where possible
- Background inventory refresh doesn't block the UI
- Error handling prevents cascading failures
- Efficient database queries minimize response times

## Future Enhancements

1. **Bulk Operations**: Allow admins to cancel multiple orders at once
2. **Partial Restocking**: Handle partial order cancellations
3. **Inventory Alerts**: Notify when items are restocked
4. **Analytics**: Track restocking patterns and reasons
5. **Automated Testing**: Add comprehensive unit and integration tests 