const ProductItemPage = async () => {
    const data= await fetch('http://127.0.0.1:3005/products/')
    
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-2xl font-bold mb-4">Product Item Page</h1>
            <p className="text-lg">This is a placeholder for the product item details.</p>
            {JSON.stringify(data, null, 2)}
        </div>
    );
}

export default ProductItemPage;