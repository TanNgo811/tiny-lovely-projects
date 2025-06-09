const ProductsPage = async () => {
    const data= await fetch('http://127.0.0.1:3005/products/')
    const products = await data.json()


    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Products</h1>
            <p>Explore our wide range of products.</p>
            {JSON.stringify(products, null, 2)}
        </div>
    );
}


export default ProductsPage;