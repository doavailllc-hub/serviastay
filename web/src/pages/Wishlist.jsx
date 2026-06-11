import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Wishlist() {

const navigate=useNavigate();

const [items,setItems]=useState([]);

useEffect(()=>{
loadWishlist();
},[]);

const loadWishlist=async()=>{

const user=JSON.parse(localStorage.getItem("user"));

if(!user) return;

const res=await axios.get(
`http://localhost:5000/api/wishlist/${user.id}`
);

setItems(res.data);

};

const removeWishlist=async(id)=>{

await axios.delete(
`http://localhost:5000/api/wishlist/${id}`
);

loadWishlist();

};

return(

<div className="min-h-screen bg-[#FAFAFC]">

<Navbar/>

<main className="max-w-7xl mx-auto px-4 md:px-8 py-10">

<div className="mb-10">

<h1 className="text-4xl font-bold">
Wishlists ❤️
</h1>

<p className="text-gray-500 mt-2">
Homes you've saved.
</p>

</div>

<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

{items.map(item=>(

<div
key={item.id}
className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition"
>

<div className="relative">

<img
src={item.image}
alt={item.title}
className="w-full h-64 object-cover"
/>

<button
onClick={()=>removeWishlist(item.id)}
className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white flex items-center justify-center"
>
❤️
</button>

</div>

<div className="p-6">

<div className="flex justify-between">

<h2 className="text-xl font-bold">
{item.title}
</h2>

<span>
⭐ {item.rating}
</span>

</div>

<p className="text-gray-500 mt-2">
{item.location}
</p>

<p className="mt-4 font-bold text-[#8363F5]">
${item.price}/night
</p>

<button
onClick={()=>navigate(`/reserve/${item.id}`)}
className="w-full mt-6 h-12 rounded-xl bg-[#8363F5] text-white"
>
View Property
</button>

</div>

</div>

))}

</div>

</main>

</div>

);

}